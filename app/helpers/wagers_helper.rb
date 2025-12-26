module WagersHelper
  def cr_card_icon_url(card_id)
    # #region agent log
    File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B', location: 'wagers_helper.rb:3', message: 'Helper called', data: {card_id: card_id, card_id_class: card_id.class.name}, timestamp: Time.now.to_i * 1000}.to_json) }
    # #endregion
    
    return nil if card_id.nil?
    
    catalog = ClashRoyale::CardsCatalog.new
    url = catalog.icon_url_for(card_id)
    
    # #region agent log
    File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D', location: 'wagers_helper.rb:11', message: 'Helper result', data: {card_id: card_id, url: url, url_present: url.present?}, timestamp: Time.now.to_i * 1000}.to_json) }
    # #endregion
    
    url
  end
end


