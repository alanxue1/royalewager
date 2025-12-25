class SettleWagerJob < ApplicationJob
  queue_as :default

  def perform(wager_id)
    wager = Wager.find_by(id: wager_id)
    return if wager.nil?

    return if wager.onchain_action.present? && wager.onchain_signature.present?

    Solana::Escrow::OracleSettle.new.call(wager)
  rescue Solana::Escrow::OracleSettle::Error => e
    Rails.logger.warn("[SettleWagerJob] wager_id=#{wager_id} error=#{e.class} msg=#{e.message}")
  end
end


