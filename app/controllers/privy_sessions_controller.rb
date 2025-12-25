class PrivySessionsController < ApplicationController
  def create
    privy_user_id = params[:privy_user_id].to_s.strip
    primary_wallet_address = params[:primary_wallet_address].to_s.strip
    email = params[:email].to_s.strip

    return render(json: { error: "privy_user_id required" }, status: :unprocessable_entity) if privy_user_id.empty?
    return render(json: { error: "primary_wallet_address required" }, status: :unprocessable_entity) if primary_wallet_address.empty?

    user =
      User.find_by(privy_user_id: privy_user_id) ||
        User.find_by(primary_wallet_address: primary_wallet_address) ||
        User.new

    user.privy_user_id = privy_user_id
    user.primary_wallet_address = primary_wallet_address
    user.email = email if email.present?

    user.save!

    session[:user_id] = user.id

    render json: { ok: true, user_id: user.id }
  rescue ActiveRecord::RecordNotUnique
    # If two requests raced on unique indexes, retry deterministically.
    retry
  end

  def destroy
    session.delete(:user_id)
    render json: { ok: true }
  end
end


