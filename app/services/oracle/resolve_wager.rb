module Oracle
  class ResolveWager
    class Error < StandardError; end

    def initialize(clash_client: ClashRoyale::Client.new)
      @clash_client = clash_client
    end

    def call(wager)
      raise ArgumentError, "wager required" if wager.nil?

      Rails.logger.info("[Oracle::ResolveWager] Starting resolution for wager_id=#{wager.id} tag_a=#{wager.tag_a} tag_b=#{wager.tag_b} status=#{wager.status}")

      return wager if wager.status_resolved? || wager.status_settled? || wager.status_refunded? || wager.status_expired?

      now = Time.current
      if wager.deadline_at && now > wager.deadline_at
        Rails.logger.info("[Oracle::ResolveWager] Wager expired: id=#{wager.id} deadline=#{wager.deadline_at} now=#{now}")
        wager.update!(status: :expired) if wager.status_active? || wager.status_awaiting_joiner_deposit?
        return wager
      end

      Rails.logger.info("[Oracle::ResolveWager] Fetching battlelogs: tag_a=#{wager.tag_a} tag_b=#{wager.tag_b}")
      battlelog_a = @clash_client.battlelog(wager.tag_a)
      battlelog_b = @clash_client.battlelog(wager.tag_b)
      Rails.logger.info("[Oracle::ResolveWager] Fetched battlelogs: tag_a_count=#{battlelog_a.size} tag_b_count=#{battlelog_b.size}")

      matcher = ClashRoyale::BattlelogMatcher.new(
        tag_a: wager.tag_a,
        tag_b: wager.tag_b,
        created_at: wager.created_at,
        deadline_at: wager.deadline_at
      )

      Rails.logger.info("[Oracle::ResolveWager] Matching battles: created_at=#{wager.created_at} deadline_at=#{wager.deadline_at}")
      result = matcher.match_first_head_to_head(battlelog_a: battlelog_a, battlelog_b: battlelog_b)
      
      if result.nil?
        Rails.logger.info("[Oracle::ResolveWager] No matching battle found for wager_id=#{wager.id}")
        return wager
      end

      Rails.logger.info("[Oracle::ResolveWager] Match found: wager_id=#{wager.id} battle_time=#{result.battle_time} winner=#{result.winner_tag} is_tie=#{result.is_tie}")

      if result.is_tie
        wager.update!(
          status: :refunded,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: nil
        )
        Rails.logger.info("[Oracle::ResolveWager] Wager refunded (tie): id=#{wager.id}")
      else
        wager.update!(
          status: :resolved,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: result.winner_tag
        )
        Rails.logger.info("[Oracle::ResolveWager] Wager resolved: id=#{wager.id} winner=#{result.winner_tag}")
      end

      wager
    rescue ClashRoyale::Client::ConfigError, ClashRoyale::Client::HttpError => e
      Rails.logger.error("[Oracle::ResolveWager] API error: wager_id=#{wager.id} error=#{e.class} msg=#{e.message}")
      raise Error, e.message
    end
  end
end


