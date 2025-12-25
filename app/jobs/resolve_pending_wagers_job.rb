class ResolvePendingWagersJob < ApplicationJob
  queue_as :default

  def perform(limit: 25)
    resolver = Oracle::ResolveWager.new

    Wager
      .where(status: [Wager.statuses[:active], Wager.statuses[:awaiting_joiner_deposit]])
      .order(created_at: :asc)
      .limit(limit)
      .find_each do |wager|
        resolver.call(wager)

        if wager.status_resolved? || wager.status_refunded? || wager.status_expired?
          SettleWagerJob.perform_later(wager.id)
        end
      rescue Oracle::ResolveWager::Error => e
        wager.update!(status: :failed) if wager.status_active?
        Rails.logger.warn("[ResolvePendingWagersJob] wager_id=#{wager.id} error=#{e.class} msg=#{e.message}")
      end
  end
end


