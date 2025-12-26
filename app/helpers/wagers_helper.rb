module WagersHelper
  def cr_card_icon_url(card_id)
    ClashRoyale::CardsCatalog.new.icon_url_for(card_id)
  end
end


