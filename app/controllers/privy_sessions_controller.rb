class PrivySessionsController < ApplicationController
  def create
    access_token = params[:access_token].to_s.strip
    requested_wallet = params[:primary_wallet_address].to_s.strip

    return render(json: { error: "access_token required" }, status: :unprocessable_entity) if access_token.empty?
    return render(json: { error: "primary_wallet_address required" }, status: :unprocessable_entity) if requested_wallet.empty?

    privy = Privy::RefreshUser.new.call(access_token)
    privy_user = privy.fetch("user")
    privy_user_id = privy_user.fetch("id").to_s

    linked = Array(privy_user["linked_accounts"])
    wallets = linked.select { |a| a.is_a?(Hash) && a["type"] == "wallet" }
    emails = linked.select { |a| a.is_a?(Hash) && a["type"] == "email" }

    wallet_ok =
      wallets.any? do |w|
        w["address"].to_s.casecmp(requested_wallet).zero?
      end

    return render(json: { error: "wallet not linked to privy user" }, status: :unauthorized) unless wallet_ok

    email = emails.first&.dig("address").to_s

    user =
      User.find_by(privy_user_id: privy_user_id) ||
        User.find_by(primary_wallet_address: requested_wallet) ||
        User.new

    user.privy_user_id = privy_user_id
    user.primary_wallet_address = requested_wallet
    user.email = email if email.present?

    user.save!

    session[:user_id] = user.id

    render json: { ok: true, user_id: user.id }
  rescue Privy::RefreshUser::Error => e
    render json: { error: e.message }, status: :unauthorized
  rescue KeyError
    render json: { error: "unexpected privy response" }, status: :unauthorized
  rescue ActiveRecord::RecordNotUnique
    # If two requests raced on unique indexes, retry deterministically.
    retry
  end

  def destroy
    session.delete(:user_id)
    render json: { ok: true }
  end
end


