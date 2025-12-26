namespace :cr do
  desc "Smoke test: fetch a player's battlelog. Usage: bin/rails cr:smoke['#P0LYQ2']"
  task :smoke, [:tag] => :environment do |_t, args|
    tag = args[:tag].to_s
    abort "usage: bin/rails cr:smoke['#P0LYQ2']" if tag.strip.empty?

    client = ClashRoyale::Client.new
    battles = client.battlelog(tag)

    puts "fetched #{battles.size} battles for #{tag}"

    battles.first(5).each_with_index do |b, i|
      battle_time = b["battleTime"]
      type = b["type"]
      game_mode = b.dig("gameMode", "name") || b.dig("gameMode", "id")

      team = (b["team"] || []).first || {}
      opponent = (b["opponent"] || []).first || {}

      team_tag = team["tag"]
      opp_tag = opponent["tag"]

      team_crowns = team["crowns"]
      opp_crowns = opponent["crowns"]

      puts "#{i + 1}. time=#{battle_time} type=#{type} mode=#{game_mode} team=#{team_tag}(#{team_crowns}) opp=#{opp_tag}(#{opp_crowns})"
    end
  rescue ClashRoyale::Client::ConfigError => e
    abort "config error: #{e.message}"
  rescue ClashRoyale::Client::HttpError => e
    abort "http error: status=#{e.status} body=#{e.body.to_s[0, 500]}"
  end

  desc "Resolve pending wagers (manual trigger)"
  task resolve: :environment do
    puts "Resolving pending wagers..."
    ResolvePendingWagersJob.perform_now
    puts "Done. Check wagers for status updates."
  end

  desc "Populate card catalog cache"
  task populate_cards: :environment do
    puts "Populating Clash Royale card catalog..."
    catalog = ClashRoyale::CardsCatalog.new
    icons = catalog.icons_by_id
    puts "Loaded #{icons.size} card icons"
    
    if icons.empty?
      puts "WARNING: No card icons loaded. Check CLASH_ROYALE_API_TOKEN and API connectivity."
    else
      sample_ids = icons.keys.first(5)
      puts "Sample card IDs: #{sample_ids.join(', ')}"
      sample_ids.each do |id|
        puts "  ID #{id}: #{icons[id]}"
      end
    end
  end
end


