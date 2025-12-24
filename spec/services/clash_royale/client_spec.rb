require "rails_helper"

RSpec.describe ClashRoyale::Client do
  it "fetches a player's battlelog with proper tag encoding and auth header" do
    stub_request(:get, "https://api.clashroyale.com/v1/players/%23P0LYQ2/battlelog")
      .with(headers: { "Authorization" => "Bearer test-token" })
      .to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })

    client = described_class.new(api_token: "test-token")
    battles = client.battlelog("#p0lyq2")

    expect(battles).to eq([])
  end

  it "raises a config error when token is missing" do
    client = described_class.new(api_token: nil)
    expect { client.battlelog("#P0LYQ2") }.to raise_error(ClashRoyale::Client::ConfigError)
  end
end


