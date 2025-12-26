class MakeWagerTagBNullable < ActiveRecord::Migration[7.2]
  def change
    change_column_null :wagers, :tag_b, true
  end
end


