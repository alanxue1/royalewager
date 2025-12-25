class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  helper_method :current_user

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = session[:user_id].present? ? User.find_by(id: session[:user_id]) : nil
  end

  def require_user!
    return if current_user.present?

    redirect_to root_path, alert: "Login required"
  end
end
