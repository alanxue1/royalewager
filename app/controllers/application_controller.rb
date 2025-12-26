class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  helper_method :current_user

  before_action :require_clash_tag!, unless: -> { skip_clash_tag_check? }

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = session[:user_id].present? ? User.find_by(id: session[:user_id]) : nil
  end

  def require_user!
    return if current_user.present?

    redirect_to root_path, alert: "Login required"
  end

  def require_clash_tag!
    return unless current_user.present?
    return if current_user.clash_royale_tag.present?

    redirect_to onboarding_path, alert: "Please set your Clash Royale tag to continue"
  end

  private

  def skip_clash_tag_check?
    controller_name == "onboardings" ||
      (controller_name == "home" && action_name == "index") ||
      (controller_name == "privy_sessions")
  end
end
