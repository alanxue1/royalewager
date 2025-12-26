class WagersController < ApplicationController
  before_action :require_user!

  def index
    user_id = current_user.id

    # Wagers where user is creator or joiner
    @wagers = Wager.where("creator_id = ? OR joiner_id = ?", user_id, user_id)
      .order(created_at: :desc)
  end

  def new
    if current_user&.clash_royale_tag.to_s.strip.empty?
      redirect_to profile_path, alert: "Set your Clash Royale tag first" and return
    end

    @wager = Wager.new(deadline_at: 30.minutes.from_now)
    @wager.duration_minutes = 30
  end

  def create
    creator = current_user
    return redirect_to(new_wager_path, alert: "Login required") if creator.nil?

    if creator.clash_royale_tag.to_s.strip.empty?
      return redirect_to(profile_path, alert: "Set your Clash Royale tag first")
    end

    amount_sol = wager_params.fetch(:amount_sol)
    dur = duration_minutes_param
    deadline_at = dur.minutes.from_now

    @wager = Wager.new(deadline_at: deadline_at)
    @wager.amount_sol = amount_sol
    @wager.creator = creator
    @wager.tag_a = creator.clash_royale_tag
    @wager.tag_b = nil
    @wager.status = :awaiting_creator_deposit

    if @wager.save
      redirect_to @wager
    else
      @wager.duration_minutes = dur
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @wager = Wager.find(params[:id])
    @active_invite =
      @wager.wager_invites.active.order(created_at: :desc).first
  end

  def accept
    wager = Wager.find(params[:id])
    user = current_user
    return accept_error!("login required", status: :unauthorized) if user.nil?

    if user.clash_royale_tag.to_s.strip.empty?
      return accept_error!("set your Clash Royale tag first", status: :unprocessable_entity)
    end

    if wager.creator_id == user.id
      return accept_error!("creator cannot accept", status: :unprocessable_entity)
    end

    if wager.joiner_id.present?
      return accept_error!("wager already has joiner", status: :unprocessable_entity)
    end

    if wager.status_expired? || wager.status_refunded? || wager.status_settled? || wager.status_failed?
      return accept_error!("wager is not joinable", status: :unprocessable_entity)
    end

    if wager.deadline_at.present? && wager.deadline_at <= Time.current
      wager.update!(status: :expired) if wager.status_awaiting_creator_deposit? || wager.status_awaiting_joiner_deposit?
      return accept_error!("wager expired", status: :unprocessable_entity)
    end

    token = params[:token].to_s.strip
    if token.present?
      invite = WagerInvite.find_by(token: token, wager_id: wager.id)
      return accept_error!("invite link already used", status: :unprocessable_entity) if invite.nil? || invite.accepted_at.present? || invite.revoked_at.present?
      invite.accept!(user)
    end

    wager.update!(joiner: user, tag_b: user.clash_royale_tag)
    respond_to do |format|
      format.json { render json: { ok: true } }
      format.html { redirect_to wager_path(wager), notice: "Wager accepted" }
    end
  end

  def invite
    wager = Wager.find(params[:id])
    user = current_user
    return redirect_to(root_path, alert: "Login required") if user.nil?

    unless wager.creator_id == user.id
      return redirect_to wager_path(wager), alert: "Only creator can invite"
    end

    if wager.joiner_id.present?
      return redirect_to wager_path(wager), alert: "Wager already has joiner"
    end

    # single-use: revoke any prior active invites
    wager.wager_invites.active.find_each(&:revoke!)

    invite = wager.wager_invites.create!(inviter: user)
    redirect_to wager_path(wager), notice: "Invite link created", flash: { invite_url: wager_invite_url(invite.token) }
  end

  def creator_deposit
    wager = Wager.find(params[:id])
    user = current_user
    return render(json: { error: "login required" }, status: :unauthorized) if user.nil?

    unless wager.creator_id == user.id
      return render(json: { error: "only creator can deposit" }, status: :forbidden)
    end

    unless wager.status_awaiting_creator_deposit?
      return render(json: { error: "wager not awaiting creator deposit" }, status: :unprocessable_entity)
    end

    sig = params[:signature].to_s.strip
    return render(json: { error: "signature required" }, status: :unprocessable_entity) if sig.empty?

    if wager.creator_deposit_signature.present? && wager.creator_deposit_signature != sig
      return render(json: { error: "creator deposit already recorded" }, status: :unprocessable_entity)
    end

    wager.update!(
      creator_deposit_signature: sig,
      creator_deposit_confirmed_at: Time.current,
      status: :awaiting_joiner_deposit
    )

    render json: { ok: true }
  end

  def joiner_deposit
    wager = Wager.find(params[:id])
    user = current_user
    
    # Log for debugging wallet mismatch
    File.open(Rails.root.join(".cursor", "debug.log"), "a") do |f|
      f.puts({
        location: "wagers_controller.rb:joiner_deposit:entry",
        message: "Joiner deposit called",
        data: {
          wager_id: wager.id,
          current_user_id: user&.id,
          wager_joiner_id: wager.joiner_id,
          wager_creator_id: wager.creator_id,
          user_wallet: user&.primary_wallet_address,
          signature: params[:signature]&.first(20),
        },
        timestamp: Time.current.to_i * 1000,
        sessionId: "debug-session",
        hypothesisId: "F",
      }.to_json)
    end
    
    return render(json: { error: "login required" }, status: :unauthorized) if user.nil?

    unless wager.status_awaiting_joiner_deposit?
      return render(json: { error: "wager not awaiting joiner deposit" }, status: :unprocessable_entity)
    end

    if wager.joiner_id.nil?
      return render(json: { error: "accept wager first" }, status: :unprocessable_entity)
    end

    unless wager.joiner_id == user.id
      return render(json: { error: "only joiner can deposit" }, status: :forbidden)
    end

    sig = params[:signature].to_s.strip
    return render(json: { error: "signature required" }, status: :unprocessable_entity) if sig.empty?

    if wager.joiner_deposit_signature.present? && wager.joiner_deposit_signature != sig
      return render(json: { error: "joiner deposit already recorded" }, status: :unprocessable_entity)
    end

    wager.update!(
      joiner_deposit_signature: sig,
      joiner_deposit_confirmed_at: Time.current,
      status: :active
    )

    render json: { ok: true }
  end

  private

  def wager_params
    params.require(:wager).permit(:amount_sol)
  end

  def duration_minutes_param
    raw = params.dig(:wager, :duration_minutes).to_s
    n = Integer(raw, exception: false)
    allowed = [10, 20, 30, 60]
    allowed.include?(n) ? n : 30
  end

  def accept_error!(message, status:)
    respond_to do |format|
      format.json { render json: { error: message }, status: status }
      format.html { redirect_to wager_path(params[:id]), alert: message }
    end
  end
end


