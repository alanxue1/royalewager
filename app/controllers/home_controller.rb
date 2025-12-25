class HomeController < ApplicationController
  def index
    redirect_to wagers_path and return if current_user.present?
  end
end


