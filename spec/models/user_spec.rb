require "rails_helper"

RSpec.describe User, type: :model do
  it "allows nil privy_user_id and primary_wallet_address" do
    user = described_class.new
    expect(user).to be_valid
  end
end
