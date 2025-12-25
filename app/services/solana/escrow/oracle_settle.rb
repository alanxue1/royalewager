require "open3"

module Solana
  module Escrow
    class OracleSettle
      class Error < StandardError; end

      def initialize(
        rpc_url: ENV.fetch("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
        program_id: ENV["ESCROW_PROGRAM_ID"],
        oracle_keypair_json: ENV["ORACLE_AUTHORITY_KEYPAIR_JSON"]
      )
        @rpc_url = rpc_url
        @program_id = program_id
        @oracle_keypair_json = oracle_keypair_json
      end

      def call(wager)
        raise ArgumentError, "wager required" if wager.nil?
        return wager if wager.onchain_action.present? && wager.onchain_signature.present?

        creator_addr = wager.creator&.primary_wallet_address.to_s
        joiner_addr = wager.joiner&.primary_wallet_address.to_s
        raise Error, "creator wallet missing" if creator_addr.empty?

        case wager.status.to_s
        when "resolved"
          raise Error, "joiner wallet missing" if joiner_addr.empty?
          winner = winner_byte_for(wager)
          sig = run_node!("settle.js", [wager.id.to_s, winner.to_s, creator_addr, joiner_addr])

          wager.update!(
            status: :settled,
            onchain_action: "settle",
            onchain_signature: sig,
            onchain_confirmed_at: Time.current
          )
        when "refunded"
          # Treat refunded as tie (winner_tag nil) and settle with winner=2 so funds return immediately.
          raise Error, "joiner wallet missing" if joiner_addr.empty?
          sig = run_node!("settle.js", [wager.id.to_s, "2", creator_addr, joiner_addr])

          wager.update!(
            onchain_action: "settle_tie",
            onchain_signature: sig,
            onchain_confirmed_at: Time.current
          )
        when "expired"
          # Refund after deadline. If joiner absent, pass creator in joiner slot (program ignores it in that branch).
          joiner_or_creator = joiner_addr.presence || creator_addr
          sig = run_node!("refund.js", [wager.id.to_s, creator_addr, joiner_or_creator])

          wager.update!(
            status: :refunded,
            onchain_action: "refund",
            onchain_signature: sig,
            onchain_confirmed_at: Time.current
          )
        else
          wager
        end
      end

      private

      def winner_byte_for(wager)
        wt = wager.winner_tag.to_s
        raise Error, "winner_tag missing" if wt.empty?

        if wt == wager.tag_a
          0
        elsif wt == wager.tag_b
          1
        else
          raise Error, "winner_tag #{wt} does not match tag_a/tag_b"
        end
      end

      def run_node!(script_name, args)
        raise Error, "ORACLE_AUTHORITY_KEYPAIR_JSON missing" if @oracle_keypair_json.to_s.strip.empty?

        script_path = Rails.root.join("solana", "escrow", "scripts", script_name).to_s
        env = {
          "SOLANA_RPC_URL" => @rpc_url,
          "ESCROW_PROGRAM_ID" => @program_id.to_s,
          "ORACLE_AUTHORITY_KEYPAIR_JSON" => @oracle_keypair_json.to_s
        }

        out = nil
        err = nil
        status = nil

        Dir.chdir(Rails.root) do
          out, err, status = Open3.capture3(env, "node", script_path, *args)
        end

        raise Error, "node #{script_name} failed: #{err.presence || out}" unless status.success?

        sig = out.to_s.strip
        raise Error, "missing signature output" if sig.empty?
        sig
      end
    end
  end
end


