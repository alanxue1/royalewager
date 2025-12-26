module Solana
  module Escrow
    class OraclePubkey
      PUBKEY_PATH = Rails.root.join("solana", "oracle-authority-pubkey.txt")

      def self.call
        from_env = ENV["ORACLE_AUTHORITY_PUBKEY"].to_s.strip
        return from_env if from_env.present?

        return "" unless PUBKEY_PATH.exist?

        PUBKEY_PATH.read.to_s.strip
      end
    end
  end
end


