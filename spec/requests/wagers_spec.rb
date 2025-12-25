require "rails_helper"

RSpec.describe "Wagers", type: :request do
  def login!
    ENV["PRIVY_APP_ID"] = "cmjktgy1k00emjr0c9ngwe2xs"

    stub_request(:get, "https://auth.privy.io/api/v1/users/me")
      .with(headers: { "Authorization" => "Bearer privy_test_token", "privy-app-id" => "cmjktgy1k00emjr0c9ngwe2xs" })
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          user: {
            id: "did:privy:spec-user",
            linked_accounts: [
              {
                type: "wallet",
                address: "So11111111111111111111111111111111111111112",
                chain_type: "solana",
                verified_at: 0,
                first_verified_at: nil,
                latest_verified_at: nil,
                wallet_client: "unknown"
              },
              {
                type: "email",
                address: "spec@example.com",
                verified_at: 0,
                first_verified_at: nil,
                latest_verified_at: nil
              }
            ]
          },
          identity_token: "test"
        }.to_json
      )

    post "/privy_session", params: {
      access_token: "privy_test_token",
      primary_wallet_address: "So11111111111111111111111111111111111111112",
    }
    expect(response).to have_http_status(:ok)
  end

  describe "GET /wagers" do
    it "renders successfully" do
      login!
      get "/wagers"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /wagers/new" do
    it "renders successfully" do
      login!
      get "/wagers/new"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /wagers" do
    it "creates a wager and redirects to show" do
      login!
      post "/wagers", params: {
        wager: {
          tag_a: "#AAAAAA",
          tag_b: "#BBBBBB",
          amount_lamports: 1234,
          deadline_at: 1.hour.from_now
        }
      }

      expect(response).to have_http_status(:found)
      wager = Wager.order(:id).last
      expect(wager).not_to be_nil
      expect(wager.tag_a).to eq("#AAAAAA")
      expect(wager.tag_b).to eq("#BBBBBB")
      expect(wager.status).to eq("awaiting_creator_deposit")
    end

    it "re-renders form with errors" do
      login!
      post "/wagers", params: {
        wager: {
          tag_a: "",
          tag_b: "",
          amount_lamports: 0,
          deadline_at: nil
        }
      }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Fix these:")
    end
  end

  describe "GET /wagers/:id" do
    it "renders successfully" do
      login!
      creator = User.find(session[:user_id])
      wager = Wager.create!(
        creator: creator,
        tag_a: "#AAAAAA",
        tag_b: "#BBBBBB",
        amount_lamports: 1234,
        deadline_at: 1.hour.from_now,
        status: :awaiting_creator_deposit
      )

      get "/wagers/#{wager.id}"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Wager ##{wager.id}")
    end
  end
end


