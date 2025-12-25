class WagersController < ApplicationController
  before_action :require_user!

  def index
    @wagers = Wager.order(created_at: :desc).limit(50)
  end

  def new
    @wager = Wager.new(deadline_at: 30.minutes.from_now)
  end

  def create
    creator = current_user
    return redirect_to(new_wager_path, alert: "Login required") if creator.nil?

    @wager = Wager.new(wager_params)
    @wager.creator = creator
    @wager.status = :awaiting_creator_deposit

    if @wager.save
      redirect_to @wager
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @wager = Wager.find(params[:id])
  end

  def join
    wager = Wager.find(params[:id])
    user = current_user
    return render(json: { error: "login required" }, status: :unauthorized) if user.nil?

    unless wager.status_awaiting_joiner_deposit?
      return render(json: { error: "wager not joinable" }, status: :unprocessable_entity)
    end

    if wager.joiner_id.present?
      return render(json: { error: "wager already has joiner" }, status: :unprocessable_entity)
    end

    if wager.creator_id == user.id
      return render(json: { error: "creator cannot join" }, status: :unprocessable_entity)
    end

    wager.update!(joiner: user)
    render json: { ok: true }
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
    return render(json: { error: "login required" }, status: :unauthorized) if user.nil?

    unless wager.status_awaiting_joiner_deposit?
      return render(json: { error: "wager not awaiting joiner deposit" }, status: :unprocessable_entity)
    end

    if wager.joiner_id.nil?
      return render(json: { error: "creator cannot join" }, status: :unprocessable_entity) if wager.creator_id == user.id
      wager.update!(joiner: user)
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
    params.require(:wager).permit(:tag_a, :tag_b, :amount_lamports, :deadline_at)
  end
end


