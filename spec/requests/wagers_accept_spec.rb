require "rails_helper"

RSpec.describe "Wagers accept", type: :request do
  def login!(wallet:, privy_id:, email:)
    ENV["PRIVY_APP_ID"] = "cmjktgy1k00emjr0c9ngwe2xs"

    stub_request(:get, "https://auth.privy.io/api/v1/users/me")
      .with(headers: { "Authorization" => "Bearer privy_test_token", "privy-app-id" => "cmjktgy1k00emjr0c9ngwe2xs" })
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          user: {
            id: privy_id,
            linked_accounts: [
              { type: "wallet", address: wallet, chain_type: "solana", verified_at: 0, wallet_client: "unknown" },
              { type: "email", address: email, verified_at: 0 },
            ],
          },
          identity_token: "test",
        }.to_json
      )

    post "/privy_session", params: { access_token: "privy_test_token", primary_wallet_address: wallet }
    expect(response).to have_http_status(:ok)
  end

  def logout!
    delete "/privy_session"
    expect(response).to have_http_status(:ok)
  end

  it "assigns joiner and sets tag_b from joiner profile" do
    login!(wallet: "So11111111111111111111111111111111111111112", privy_id: "did:privy:creator", email: "creator@example.com")
    creator = User.find(session[:user_id])
    creator.update!(clash_royale_tag: "#P0LYQ2")

    wager = Wager.create!(creator: creator, tag_a: creator.clash_royale_tag, tag_b: nil, amount_lamports: 1, deadline_at: 1.hour.from_now)

    logout!
    login!(wallet: "So22222222222222222222222222222222222222222", privy_id: "did:privy:joiner", email: "joiner@example.com")
    joiner = User.find(session[:user_id])
    joiner.update!(clash_royale_tag: "#2PP")

    post "/wagers/#{wager.id}/accept"
    expect(response).to have_http_status(:found)
    wager.reload
    expect(wager.joiner_id).to eq(joiner.id)
    expect(wager.tag_b).to eq("#2PP")
  end

  it "rejects accept if joiner is missing clash tag" do
    login!(wallet: "So11111111111111111111111111111111111111112", privy_id: "did:privy:creator", email: "creator@example.com")
    creator = User.find(session[:user_id])
    creator.update!(clash_royale_tag: "#P0LYQ2")
    wager = Wager.create!(creator: creator, tag_a: creator.clash_royale_tag, tag_b: nil, amount_lamports: 1, deadline_at: 1.hour.from_now)

    logout!
    login!(wallet: "So22222222222222222222222222222222222222222", privy_id: "did:privy:joiner", email: "joiner@example.com")

    post "/wagers/#{wager.id}/accept", as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)).to include("error" => "set your Clash Royale tag first")
  end
end


