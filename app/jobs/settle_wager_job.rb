class SettleWagerJob < ApplicationJob
  queue_as :default

  def perform(wager_id)
    wager = Wager.find_by(id: wager_id)
    return if wager.nil?

    return if wager.onchain_action.present? && wager.onchain_signature.present?

    Rails.logger.info("[SettleWagerJob] Starting settlement for wager_id=#{wager_id} status=#{wager.status}")
    Solana::Escrow::OracleSettle.new.call(wager)
    Rails.logger.info("[SettleWagerJob] Successfully settled wager_id=#{wager_id}")
  rescue Solana::Escrow::OracleSettle::Error => e
    Rails.logger.error("[SettleWagerJob] wager_id=#{wager_id} error=#{e.class} msg=#{e.message}")
    # Don't re-raise - let the job complete so it doesn't retry indefinitely
    # The error is logged and can be investigated manually
  end
end


