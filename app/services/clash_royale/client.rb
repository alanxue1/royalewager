require "json"
require "net/http"
require "uri"
require "cgi"

module ClashRoyale
  class Client
    BASE_URL = "https://api.clashroyale.com".freeze

    class Error < StandardError; end
    class ConfigError < Error; end
    class HttpError < Error
      attr_reader :status, :body

      def initialize(status:, body:)
        super("Clash Royale API error status=#{status}")
        @status = status
        @body = body
      end
    end

    def initialize(api_token: ENV["CLASH_ROYALE_API_TOKEN"], base_url: BASE_URL)
      @api_token = api_token
      @base_url = base_url
    end

    def battlelog(player_tag)
      get_json("/v1/players/#{escape_player_tag(player_tag)}/battlelog")
    end

    def cards
      get_json("/v1/cards")
    end

    private

    def escape_player_tag(tag)
      normalized = tag.to_s.strip
      raise ArgumentError, "player_tag required" if normalized.empty?

      normalized = "##{normalized}" unless normalized.start_with?("#")
      CGI.escape(normalized).upcase
    end

    def get_json(path)
      raise ConfigError, "CLASH_ROYALE_API_TOKEN is missing" if @api_token.to_s.strip.empty?

      uri = URI.join(@base_url, path)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 5
      http.read_timeout = 10

      req = Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{@api_token}"
      req["Accept"] = "application/json"

      res = http.request(req)
      body = res.body.to_s

      if res.code.to_i >= 400
        raise HttpError.new(status: res.code.to_i, body: body)
      end

      JSON.parse(body)
    rescue JSON::ParserError => e
      raise Error, "invalid JSON from Clash Royale API: #{e.message}"
    end
  end
end


