require "rails_helper"

RSpec.describe "Wager invites", type: :request do
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

  it "generates a single-use invite link and revokes prior active invites" do
    login!(wallet: "So11111111111111111111111111111111111111112", privy_id: "did:privy:creator", email: "creator@example.com")
    creator = User.find(session[:user_id])
    creator.update!(clash_royale_tag: "#P0LYQ2")

    wager = Wager.create!(creator: creator, tag_a: creator.clash_royale_tag, tag_b: nil, amount_lamports: 1, deadline_at: 1.hour.from_now)

    post "/wagers/#{wager.id}/invite"
    expect(response).to have_http_status(:found)
    first = wager.wager_invites.order(:id).last
    expect(first).to be_present
    expect(first.revoked_at).to be_nil
    expect(first.accepted_at).to be_nil

    post "/wagers/#{wager.id}/invite"
    expect(response).to have_http_status(:found)
    wager.reload
    first.reload
    second = wager.wager_invites.order(:id).last

    expect(first.revoked_at).to be_present
    expect(second.revoked_at).to be_nil
    expect(second.id).not_to eq(first.id)
  end

  it "accepts via token and marks invite accepted (single-use)" do
    login!(wallet: "So11111111111111111111111111111111111111112", privy_id: "did:privy:creator", email: "creator@example.com")
    creator = User.find(session[:user_id])
    creator.update!(clash_royale_tag: "#P0LYQ2")
    wager = Wager.create!(creator: creator, tag_a: creator.clash_royale_tag, tag_b: nil, amount_lamports: 1, deadline_at: 1.hour.from_now)
    invite = wager.wager_invites.create!(inviter: creator)

    logout!
    login!(wallet: "So22222222222222222222222222222222222222222", privy_id: "did:privy:joiner", email: "joiner@example.com")
    joiner = User.find(session[:user_id])
    joiner.update!(clash_royale_tag: "#2PP")

    post "/wagers/#{wager.id}/accept", params: { token: invite.token }
    expect(response).to have_http_status(:found)

    invite.reload
    expect(invite.accepted_by_id).to eq(joiner.id)
    expect(invite.accepted_at).to be_present
  end
end


