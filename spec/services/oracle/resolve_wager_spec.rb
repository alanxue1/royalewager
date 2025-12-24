require "rails_helper"

RSpec.describe Oracle::ResolveWager do
  def fixture_json(name)
    JSON.parse(Rails.root.join("spec/fixtures/clash_royale/#{name}").read)
  end

  it "marks wager resolved and stores winner when a match is found" do
    creator = User.create!
    wager = Wager.create!(
      creator: creator,
      tag_a: "#AAAAAA",
      tag_b: "#BBBBBB",
      amount_lamports: 1000,
      deadline_at: 1.hour.from_now,
      status: :active
    )
    # Ensure the wager is created before the fixture battleTime (20251224T100000.000Z).
    wager.update_column(:created_at, Time.utc(2025, 12, 24, 9, 45, 0))

    clash_client = instance_double(ClashRoyale::Client)
    allow(clash_client).to receive(:battlelog).with("#AAAAAA").and_return(fixture_json("battlelog_tag_a.json"))
    allow(clash_client).to receive(:battlelog).with("#BBBBBB").and_return(fixture_json("battlelog_tag_b.json"))

    resolver = described_class.new(clash_client: clash_client)
    resolver.call(wager)

    wager.reload
    expect(wager.status).to eq("resolved")
    expect(wager.winner_tag).to eq("#AAAAAA")
    expect(wager.battle_fingerprint).to match(/\A[0-9a-f]{64}\z/)
    expect(wager.battle_time).not_to be_nil
  end

  it "marks wager expired if past deadline and unresolved" do
    creator = User.create!
    wager = Wager.create!(
      creator: creator,
      tag_a: "#AAAAAA",
      tag_b: "#BBBBBB",
      amount_lamports: 1000,
      deadline_at: 1.minute.ago,
      status: :active
    )

    clash_client = instance_double(ClashRoyale::Client)
    resolver = described_class.new(clash_client: clash_client)
    resolver.call(wager)

    wager.reload
    expect(wager.status).to eq("expired")
  end
end


