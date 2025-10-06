import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import he from './he.json';
import hi from './hi.json';
import it from './it.json';
import ja from './ja.json';
import nl from './nl.json';
import pt from './pt.json';
import ru from './ru.json';
import uk from './uk.json';
import zhHans from './zh-Hans.json';
import zhHant from './zh-Hant.json';
export default {
	de,
	en,
	es,
	fr,
	hi,
	it,
	ja,
	nl,
	pt,
	ru,
	uk,
	'zh-Hans': zhHans,
	'zh-Hant': zhHant,
	ar,
	he,
} as Record<string, Record<string, { text: string; translationContext: string }> | undefined>;
