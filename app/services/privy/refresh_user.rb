require "json"
require "net/http"
require "uri"

module Privy
  class RefreshUser
    class Error < StandardError; end

    BASE_URL = "https://auth.privy.io".freeze

    def initialize(base_url: BASE_URL, app_id: ENV["PRIVY_APP_ID"])
      @base_url = base_url
      @app_id = app_id.to_s.strip
    end

    def call(access_token)
      token = access_token.to_s.strip
      raise Error, "access_token required" if token.empty?
      raise Error, "PRIVY_APP_ID is missing" if @app_id.empty?

      uri = URI.join(@base_url, "/api/v1/users/me")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 5
      http.read_timeout = 10

      req = Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{token}"
      req["privy-app-id"] = @app_id
      req["Accept"] = "application/json"

      res = http.request(req)
      body = res.body.to_s

      if res.code.to_i >= 400
        raise Error, "privy api error status=#{res.code.to_i} body=#{body[0, 300]}"
      end

      JSON.parse(body)
    rescue JSON::ParserError => e
      raise Error, "invalid JSON from privy: #{e.message}"
    end
  end
end


