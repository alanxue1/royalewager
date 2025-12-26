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

      battle_data = build_battle_data(battle: result.battle, wager: wager)

      if result.is_tie
        wager.update!(
          status: :refunded,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: nil,
          battle_data: battle_data
        )
        Rails.logger.info("[Oracle::ResolveWager] Wager refunded (tie): id=#{wager.id}")
      else
        wager.update!(
          status: :resolved,
          battle_time: result.battle_time,
          battle_fingerprint: result.battle_fingerprint,
          winner_tag: result.winner_tag,
          battle_data: battle_data
        )
        Rails.logger.info("[Oracle::ResolveWager] Wager resolved: id=#{wager.id} winner=#{result.winner_tag}")
      end

      wager
    rescue ClashRoyale::Client::ConfigError, ClashRoyale::Client::HttpError => e
      Rails.logger.error("[Oracle::ResolveWager] API error: wager_id=#{wager.id} error=#{e.class} msg=#{e.message}")
      raise Error, e.message
    end

    private

    def normalize_tag(tag)
      s = tag.to_s.strip.upcase
      s = "##{s}" if s.present? && !s.start_with?("#")
      s
    end

    def slim_cards(cards)
      (cards || []).map do |c|
        {
          "id" => c["id"],
          "name" => c["name"],
          "level" => c["level"],
          "maxLevel" => c["maxLevel"]
        }
      end
    end

    def build_player_payload(player_hash)
      clan = player_hash["clan"].is_a?(Hash) ? player_hash["clan"] : {}
      {
        "tag" => normalize_tag(player_hash["tag"]),
        "name" => player_hash["name"],
        "crowns" => player_hash["crowns"],
        "startingTrophies" => player_hash["startingTrophies"],
        "trophyChange" => player_hash["trophyChange"],
        "clan" => {
          "tag" => clan["tag"],
          "name" => clan["name"],
          "badgeId" => clan["badgeId"]
        },
        "deck" => slim_cards(player_hash["cards"])
      }
    end

    def build_battle_data(battle:, wager:)
      team = (battle["team"] || []).first || {}
      opponent = (battle["opponent"] || []).first || {}

      tag_a = normalize_tag(wager.tag_a)
      tag_b = normalize_tag(wager.tag_b)

      team_tag = normalize_tag(team["tag"])
      opp_tag = normalize_tag(opponent["tag"])

      # Map battle players onto wager participants (tag_a/tag_b) deterministically.
      a_player =
        if team_tag == tag_a
          team
        elsif opp_tag == tag_a
          opponent
        else
          team
        end

      b_player =
        if team_tag == tag_b
          team
        elsif opp_tag == tag_b
          opponent
        else
          opponent
        end

      {
        "battleTime" => battle["battleTime"],
        "type" => battle["type"],
        "gameMode" => battle["gameMode"],
        "tag_a_crowns" => Integer(a_player["crowns"] || 0),
        "tag_b_crowns" => Integer(b_player["crowns"] || 0),
        "tag_a" => build_player_payload(a_player),
        "tag_b" => build_player_payload(b_player)
      }
    end
  end
end


