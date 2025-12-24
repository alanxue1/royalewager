require "rails_helper"

RSpec.describe "Wagers", type: :request do
  describe "GET /wagers" do
    it "renders successfully" do
      get "/wagers"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /wagers/new" do
    it "renders successfully" do
      get "/wagers/new"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /wagers" do
    it "creates a wager and redirects to show" do
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
      creator = User.create!
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


