// The recipe book (요리비법서) in the notes: its button, its panel
// (downloaded when first opened) and the dishes the cooking classes make.
// Rules in core/recipe-book.js.
import { RecipeBook, RECIPES, recipeOf } from '../core/recipe-book.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { t } from '../core/i18n.js';

/** game: { $, bag, shop } */
export function createRecipeBook({ $, bag, shop }) {
  const book = new RecipeBook();
  book.fill(bag.list()); // dishes made before the book (once)
  const ui = lazyPanel(() => import('../ui/recipe-book-ui.js').then(({ RecipeBookUI }) => new RecipeBookUI({ root: $('recipe-panel'), book })));
  const refresh = () => { $('recipe-btn').querySelector('span').textContent = `${t('recipe.title')} · ${book.kinds}/${RECIPES.length}`; };
  $('recipe-btn').onclick = () => { $('notes-panel').hidden = true; ui.show(); };
  refresh();
  return {
    book, ui, refresh,
    // A cooking class just made this bag entry: write it in the book.
    cooked(e) {
      const r = recipeOf(e);
      if (!r) return;
      if (book.cooked(r.id, r.score)) {
        shop.toast(`📜 ${t('recipe.new', { dish: t('recipe.d.' + r.id), k: book.kinds, all: RECIPES.length })}`);
        ui.fresh = r.id; // (its stamp slams in when the book is next opened)
      }
      refresh();
    },
  };
}
