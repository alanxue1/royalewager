class ResolvePendingWagersJob < ApplicationJob
  queue_as :default

  def perform(limit: 25)
    Rails.logger.info("[ResolvePendingWagersJob] Starting resolution check")
    
    resolver = Oracle::ResolveWager.new
    wagers = Wager.where(status: [Wager.statuses[:active], Wager.statuses[:awaiting_joiner_deposit]])
      .order(created_at: :asc)
      .limit(limit)
    
    count = wagers.count
    Rails.logger.info("[ResolvePendingWagersJob] Found #{count} pending wagers")

    wagers.find_each do |wager|
      Rails.logger.info("[ResolvePendingWagersJob] Checking wager_id=#{wager.id} tag_a=#{wager.tag_a} tag_b=#{wager.tag_b}")
      
      resolver.call(wager)
      wager.reload

      if wager.status_resolved? || wager.status_refunded? || wager.status_expired?
        Rails.logger.info("[ResolvePendingWagersJob] Wager resolved: id=#{wager.id} status=#{wager.status} winner=#{wager.winner_tag}")
        SettleWagerJob.perform_later(wager.id)
      end
    rescue Oracle::ResolveWager::Error => e
      wager.update!(status: :failed) if wager.status_active?
      Rails.logger.warn("[ResolvePendingWagersJob] wager_id=#{wager.id} error=#{e.class} msg=#{e.message}")
    end
    
    Rails.logger.info("[ResolvePendingWagersJob] Completed resolution check")
  ensure
    # Always schedule next run in 10 seconds, even if there was an error
    ResolvePendingWagersJob.set(wait: 10.seconds).perform_later(limit: limit)
    Rails.logger.info("[ResolvePendingWagersJob] Scheduled next run in 10 seconds")
  end
end


