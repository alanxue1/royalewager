class WagerInvitesController < ApplicationController
  before_action :require_user!

  def show
    @invite = WagerInvite.find_by!(token: params[:token].to_s)
    @wager = @invite.wager

    if @invite.accepted_at.present? || @invite.revoked_at.present?
      redirect_to wager_path(@wager), alert: "Invite link already used" and return
    end
  end
end


