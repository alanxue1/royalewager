class AddBattleDataToWagers < ActiveRecord::Migration[7.2]
  def change
    add_column :wagers, :battle_data, :json
  end
end


