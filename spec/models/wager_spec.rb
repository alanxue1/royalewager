require "rails_helper"

RSpec.describe Wager, type: :model do
  it "validates presence and amount" do
    creator = User.create!

    wager = described_class.new(
      creator: creator,
      tag_a: "#AAAAAA",
      tag_b: "#BBBBBB",
      amount_lamports: 1,
      deadline_at: 1.hour.from_now
    )

    expect(wager).to be_valid
  end
end
