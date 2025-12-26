namespace :wagers do
  desc "Check oracle resolution status"
  task check_oracle: :environment do
    puts "\n=== Oracle Resolution Status ==="
    
    active = Wager.where(status: [:active, :awaiting_joiner_deposit]).count
    resolved = Wager.where(status: :resolved).count
    settled = Wager.where(status: :settled).count
    refunded = Wager.where(status: :refunded).count
    expired = Wager.where(status: :expired).count
    
    puts "Active/Awaiting: #{active}"
    puts "Resolved: #{resolved}"
    puts "Settled: #{settled}"
    puts "Refunded: #{refunded}"
    puts "Expired: #{expired}"
    
    if active > 0
      puts "\nPending wagers:"
      Wager.where(status: [:active, :awaiting_joiner_deposit]).each do |w|
        puts "  ID: #{w.id} | #{w.tag_a} vs #{w.tag_b} | Created: #{w.created_at} | Deadline: #{w.deadline_at}"
      end
    end
    
    if resolved > 0
      puts "\nRecently resolved:"
      Wager.where(status: :resolved).order(updated_at: :desc).limit(5).each do |w|
        puts "  ID: #{w.id} | Winner: #{w.winner_tag} | Battle: #{w.battle_time}"
      end
    end
    
    puts "\n=== Triggering manual resolution check ==="
    ResolvePendingWagersJob.perform_now
    puts "Done. Check logs for details.\n"
  end
end

