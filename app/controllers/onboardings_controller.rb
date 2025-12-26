class OnboardingsController < ApplicationController
  before_action :require_user!
  skip_before_action :require_clash_tag!

  def show
    @user = current_user
    redirect_to wagers_path if @user.clash_royale_tag.present?
  end

  def update
    @user = current_user

    if @user.update(profile_params)
      redirect_to wagers_path, notice: "Welcome! Your Clash Royale tag has been saved."
    else
      render :show, status: :unprocessable_entity
    end
  end

  private

  def profile_params
    params.require(:user).permit(:clash_royale_tag)
  end
end

