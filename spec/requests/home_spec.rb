require "rails_helper"

RSpec.describe "Home", type: :request do
  it "renders landing page" do
    get "/"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Royale Wager")
  end
end


