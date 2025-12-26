module ClashRoyale
  class CardsCatalog
    CACHE_KEY = "cr:cards:v1".freeze

    def initialize(client: ClashRoyale::Client.new, cache: Rails.cache)
      @client = client
      @cache = cache
    end

    def icon_url_for(card_id)
      return nil if card_id.nil?
      icons_by_id[card_id.to_i]
    end

    def icons_by_id
      @cache.fetch(CACHE_KEY, expires_in: 24.hours) do
        fetch_icons_by_id
      end
    end

    private

    def fetch_icons_by_id
      payload = @client.cards
      items = payload.is_a?(Hash) ? (payload["items"] || []) : []

      out = {}
      items.each do |c|
        id = c["id"]
        next if id.nil?

        urls = c["iconUrls"] || {}
        url = urls["medium"] || urls["large"] || urls.values.compact.first
        out[id.to_i] = url if url.present?
      end
      out
    rescue ClashRoyale::Client::Error => e
      Rails.logger.warn("[ClashRoyale::CardsCatalog] fetch failed: #{e.class} #{e.message}")
      {}
    end
  end
end


