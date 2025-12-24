require "rails_helper"

RSpec.describe ClashRoyale::BattlelogMatcher do
  def fixture_json(name)
    JSON.parse(Rails.root.join("spec/fixtures/clash_royale/#{name}").read)
  end

  it "picks the first post-created head-to-head match that appears in both logs and computes winner/fingerprint deterministically" do
    created_at = Time.utc(2025, 12, 24, 9, 45, 0)

    matcher = described_class.new(
      tag_a: "#AAAAAA",
      tag_b: "#BBBBBB",
      created_at: created_at,
      deadline_at: Time.utc(2025, 12, 24, 12, 0, 0)
    )

    result = matcher.match_first_head_to_head(
      battlelog_a: fixture_json("battlelog_tag_a.json"),
      battlelog_b: fixture_json("battlelog_tag_b.json")
    )

    expect(result).not_to be_nil
    expect(result.battle_time).to eq(Time.utc(2025, 12, 24, 10, 0, 0))
    expect(result.is_tie).to eq(false)
    expect(result.winner_tag).to eq("#AAAAAA")
    expect(result.battle_fingerprint).to match(/\A[0-9a-f]{64}\z/)
  end

  it "returns nil if no post-created head-to-head exists in both logs" do
    matcher = described_class.new(
      tag_a: "#AAAAAA",
      tag_b: "#BBBBBB",
      created_at: Time.utc(2025, 12, 24, 10, 0, 1),
      deadline_at: Time.utc(2025, 12, 24, 12, 0, 0)
    )

    result = matcher.match_first_head_to_head(
      battlelog_a: fixture_json("battlelog_tag_a.json"),
      battlelog_b: fixture_json("battlelog_tag_b.json")
    )

    expect(result).to be_nil
  end

  it "returns a tie result when crowns are equal" do
    created_at = Time.utc(2025, 12, 24, 9, 0, 0)
    deadline_at = Time.utc(2025, 12, 24, 12, 0, 0)

    battle_a = {
      "battleTime" => "20251224T091000.000Z",
      "type" => "PvP",
      "gameMode" => { "id" => 72000006, "name" => "1v1" },
      "team" => [{ "tag" => "#AAAAAA", "crowns" => 1 }],
      "opponent" => [{ "tag" => "#BBBBBB", "crowns" => 1 }]
    }

    battle_b = {
      "battleTime" => "20251224T091000.000Z",
      "type" => "PvP",
      "gameMode" => { "id" => 72000006, "name" => "1v1" },
      "team" => [{ "tag" => "#BBBBBB", "crowns" => 1 }],
      "opponent" => [{ "tag" => "#AAAAAA", "crowns" => 1 }]
    }

    matcher = described_class.new(tag_a: "#AAAAAA", tag_b: "#BBBBBB", created_at: created_at, deadline_at: deadline_at)
    result = matcher.match_first_head_to_head(battlelog_a: [battle_a], battlelog_b: [battle_b])

    expect(result).not_to be_nil
    expect(result.is_tie).to eq(true)
    expect(result.winner_tag).to be_nil
  end
end


