module Oracle
  class ResolveWager
    class Error < StandardError; end

    def initialize(clash_client: ClashRoyale::Client.new)
      @clash_client = clash_client
    end

    def call(wager)
      raise ArgumentError, "wager required" if wager.nil?

      return wager if wager.status_resolved? || wager.status_settled? || wager.status_refunded? || wager.status_expired?

      now = Time.current
      if wager.deadline_at && now > wager.deadline_at
        wager.update!(status: :expired) if wager.status_active? || wager.status_awaiting_joiner_deposit?
        return wager
      end

      battlelog_a = @clash_client.battlelog(wager.tag_a)
      battlelog_b = @clash_client.battlelog(wager.tag_b)

      matcher = ClashRoyale::BattlelogMatcher.new(
        tag_a: wager.tag_a,
        tag_b: wager.tag_b,
        created_at: wager.created_at,
        deadline_at: wager.deadline_at
      )

      result = matcher.match_first_head_to_head(battlelog_a: battlelog_a, battlelog_b: battlelog_b)
      return wager if result.nil?

      if result.is_tie
        wager.update!(
          status: :refunded,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: nil
        )
      else
        wager.update!(
          status: :resolved,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: result.winner_tag
        )
      end

      wager
    rescue ClashRoyale::Client::ConfigError, ClashRoyale::Client::HttpError => e
      raise Error, e.message
    end
  end
end


