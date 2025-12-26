module ClashRoyale
  class CardsCatalog
    CACHE_KEY = "cr:cards:v1".freeze

    def initialize(client: ClashRoyale::Client.new, cache: Rails.cache)
      @client = client
      @cache = cache
    end

    def icon_url_for(card_id)
      return nil if card_id.nil?
      
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B', location: 'cards_catalog.rb:10', message: 'icon_url_for called', data: {card_id: card_id, card_id_to_i: card_id.to_i}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      icons = icons_by_id
      result = icons[card_id.to_i]
      
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E', location: 'cards_catalog.rb:16', message: 'icon_url_for result', data: {card_id: card_id, card_id_to_i: card_id.to_i, found: !result.nil?, url: result, catalog_size: icons.size, sample_ids: icons.keys.first(5)}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      result
    end

    def icons_by_id
      cached = @cache.read(CACHE_KEY)
      
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:25', message: 'Cache check', data: {cache_key: CACHE_KEY, cache_hit: !cached.nil?, cached_size: cached.is_a?(Hash) ? cached.size : nil}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      result = @cache.fetch(CACHE_KEY, expires_in: 24.hours) do
        fetch_icons_by_id
      end
      
      # If cache is empty (due to API failure), try to fetch again
      if result.empty? && cached.nil?
        # #region agent log
        File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:37', message: 'Retrying API fetch after empty result', data: {}, timestamp: Time.now.to_i * 1000}.to_json) }
        # #endregion
        
        begin
          fresh_data = fetch_icons_by_id
          @cache.write(CACHE_KEY, fresh_data, expires_in: 24.hours) unless fresh_data.empty?
          fresh_data
        rescue ClashRoyale::Client::Error => e
          # #region agent log
          File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:45', message: 'Retry also failed', data: {error_class: e.class.name, error_message: e.message}, timestamp: Time.now.to_i * 1000}.to_json) }
          # #endregion
          {}
        end
      else
        result
      end
    end

    private

    def fetch_icons_by_id
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:35', message: 'Fetching from API', data: {}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      payload = @client.cards
      items = payload.is_a?(Hash) ? (payload["items"] || []) : []

      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:40', message: 'API response parsed', data: {payload_class: payload.class.name, items_count: items.size, first_item_keys: items.first&.keys}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion

      out = {}
      items.each do |c|
        id = c["id"]
        next if id.nil?

        urls = c["iconUrls"] || {}
        url = urls["medium"] || urls["large"] || urls.values.compact.first
        
        # #region agent log
        if out.size < 3
          File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C', location: 'cards_catalog.rb:50', message: 'Processing card', data: {card_id: id, icon_urls_keys: urls.keys, selected_url: url, url_present: url.present?}, timestamp: Time.now.to_i * 1000}.to_json) }
        end
        # #endregion
        
        out[id.to_i] = url if url.present?
      end
      
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:60', message: 'Catalog built', data: {total_cards: out.size, sample_ids: out.keys.first(5), sample_urls: out.values.first(3)}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      out
    rescue ClashRoyale::Client::Error => e
      # #region agent log
      File.open('/Users/alanxue/Documents/Documents - Mac/Coding Projects/wager-royale/.cursor/debug.log', 'a') { |f| f.puts({sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A', location: 'cards_catalog.rb:65', message: 'API fetch failed', data: {error_class: e.class.name, error_message: e.message}, timestamp: Time.now.to_i * 1000}.to_json) }
      # #endregion
      
      Rails.logger.warn("[ClashRoyale::CardsCatalog] fetch failed: #{e.class} #{e.message}")
      {}
    end
  end
end


