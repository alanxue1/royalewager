require "rails_helper"

RSpec.describe User, type: :model do
  it "allows nil privy_user_id and primary_wallet_address" do
    user = described_class.new
    expect(user).to be_valid
  end

  describe "clash_royale_tag" do
    it "normalizes by stripping and adding leading # and upcasing" do
      user = described_class.create!(clash_royale_tag: "  p0lyq2 \n")
      expect(user.clash_royale_tag).to eq("#P0LYQ2")
    end

    it "rejects invalid tags" do
      user = described_class.new(clash_royale_tag: "#INVALID!")
      expect(user).not_to be_valid
      expect(user.errors[:clash_royale_tag]).to be_present
    end
  end
end
