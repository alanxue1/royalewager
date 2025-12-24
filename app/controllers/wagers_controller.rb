class WagersController < ApplicationController
  def index
    @wagers = Wager.order(created_at: :desc).limit(50)
  end

  def new
    @wager = Wager.new(deadline_at: 30.minutes.from_now)
  end

  def create
    # Placeholder until Privy auth is wired; for now create a dummy creator.
    creator = User.first_or_create!

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

  private

  def wager_params
    params.require(:wager).permit(:tag_a, :tag_b, :amount_lamports, :deadline_at)
  end
end


