require "digest"
require "time"

module ClashRoyale
  class BattlelogMatcher
    Result = Struct.new(
      :battle_time,
      :battle_time_raw,
      :battle_fingerprint,
      :winner_tag,
      :is_tie,
      :battle,
      keyword_init: true
    )

    def initialize(tag_a:, tag_b:, created_at:, deadline_at: nil)
      @tag_a = normalize_tag(tag_a)
      @tag_b = normalize_tag(tag_b)
      @created_at = created_at
      @deadline_at = deadline_at
    end

    # battlelog_a/b are arrays from /players/%23TAG/battlelog
    def match_first_head_to_head(battlelog_a:, battlelog_b:)
      a_by_fp = index_head_to_head(battlelog_a, expected_team_tag: @tag_a, expected_opponent_tag: @tag_b)
      b_by_fp = index_head_to_head(battlelog_b, expected_team_tag: @tag_b, expected_opponent_tag: @tag_a)

      common_fps = a_by_fp.keys & b_by_fp.keys
      return nil if common_fps.empty?

      # For determinism: choose earliest battle after wager creation; tie-break by fingerprint.
      chosen_fp =
        common_fps.min_by do |fp|
          [a_by_fp[fp][:time], fp]
        end

      entry = a_by_fp[chosen_fp] || b_by_fp.fetch(chosen_fp)
      t = entry[:time]
      battle = entry[:battle]

      team = (battle["team"] || []).first || {}
      opponent = (battle["opponent"] || []).first || {}
      team_tag = normalize_tag(team["tag"])
      opp_tag = normalize_tag(opponent["tag"])

      team_crowns = Integer(team["crowns"] || 0)
      opp_crowns = Integer(opponent["crowns"] || 0)

      is_tie = team_crowns == opp_crowns
      winner_tag =
        if is_tie
          nil
        elsif team_crowns > opp_crowns
          team_tag
        else
          opp_tag
        end

      Result.new(
        battle_time: t,
        battle_time_raw: battle["battleTime"],
        battle_fingerprint: chosen_fp,
        winner_tag: winner_tag,
        is_tie: is_tie,
        battle: battle
      )
    end

    private

    def normalize_tag(tag)
      s = tag.to_s.strip.upcase
      raise ArgumentError, "player_tag required" if s.empty?
      s.start_with?("#") ? s : "##{s}"
    end

    def within_window?(time)
      return false if time.nil?
      return false if time < @created_at
      return false if @deadline_at && time > @deadline_at
      true
    end

    def parse_battle_time(raw)
      return nil if raw.to_s.empty?

      # CR battleTime looks like "20240525T153000.000Z" and is UTC (Z suffix).
      m = raw.match(/\A(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z\z/)
      return nil unless m

      Time.utc(
        m[1].to_i,
        m[2].to_i,
        m[3].to_i,
        m[4].to_i,
        m[5].to_i,
        m[6].to_i,
        m[7].to_i * 1000
      )
    end

    def head_to_head?(battle, expected_team_tag:, expected_opponent_tag:)
      team = battle["team"]
      opponent = battle["opponent"]
      return false unless team.is_a?(Array) && opponent.is_a?(Array)
      return false unless team.size == 1 && opponent.size == 1

      team_tag = team.first["tag"]
      opp_tag = opponent.first["tag"]
      return false if team_tag.nil? || opp_tag.nil?

      normalize_tag(team_tag) == expected_team_tag && normalize_tag(opp_tag) == expected_opponent_tag
    rescue ArgumentError
      false
    end

    def index_head_to_head(battlelog, expected_team_tag:, expected_opponent_tag:)
      out = {}

      battlelog.each do |battle|
        next unless head_to_head?(battle, expected_team_tag: expected_team_tag, expected_opponent_tag: expected_opponent_tag)

        t = parse_battle_time(battle["battleTime"])
        next unless within_window?(t)

        fp = fingerprint_for(battle)

        # Keep earliest occurrence (battlelogs are usually reverse chronological, so guard for ordering).
        existing = out[fp]
        if existing.nil? || t < existing[:time]
          out[fp] = { time: t, battle: battle }
        end
      end

      out
    end

    def fingerprint_for(battle)
      team = (battle["team"] || []).first || {}
      opponent = (battle["opponent"] || []).first || {}

      players = [
        { tag: normalize_tag(team["tag"]), crowns: Integer(team["crowns"] || 0) },
        { tag: normalize_tag(opponent["tag"]), crowns: Integer(opponent["crowns"] || 0) }
      ].sort_by { |p| p[:tag] }

      payload = {
        battle_time: battle["battleTime"].to_s,
        type: battle["type"].to_s,
        game_mode_id: battle.dig("gameMode", "id"),
        players: players
      }

      Digest::SHA256.hexdigest(payload.to_json)
    rescue ArgumentError
      Digest::SHA256.hexdigest(battle.to_json)
    end
  end
end


