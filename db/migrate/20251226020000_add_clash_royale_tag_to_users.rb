class AddClashRoyaleTagToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :clash_royale_tag, :string
    add_index :users, :clash_royale_tag, unique: true
  end
end


