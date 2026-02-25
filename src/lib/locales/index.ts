import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import et from './et.json';
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
	ar,
	de,
	en,
	es,
	et,
	fr,
	he,
	hi,
	it,
	ja,
	nl,
	pt,
	ru,
	uk,
	'zh-Hans': zhHans,
	'zh-Hant': zhHant,
} as Record<string, Record<string, { text: string; translationContext: string }> | undefined>;
