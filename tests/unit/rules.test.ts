import { Store } from "oxigraph";
import { describe, expect, it } from "vitest";
import { loadRules, runInference } from "../../scripts/lib/reasoner";

const PREFIXES = `
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix :     <http://www.ibam-ujkz.bf/ontologies/culture#> .
`;
const ASK_PREFIXES = PREFIXES.replace(/@prefix (\S+)\s+(<[^>]+>) \./g, "PREFIX $1 $2");

const RULES = loadRules();

/** Runs a single rule to its fixed point on a mini-graph, then evaluates ASK patterns. */
function infer(file: string, turtle: string) {
  const rule = RULES.find((r) => r.file === file);
  if (!rule) throw new Error(`Unknown rule ${file}`);
  const store = new Store();
  store.load(PREFIXES + turtle, { format: "text/turtle" });
  runInference(store, [rule]);
  return (pattern: string) => store.query(`${ASK_PREFIXES} ASK { ${pattern} }`) as boolean;
}

interface Case {
  given: string;
  holds: string[];
  absent?: string[];
}

const CASES: Record<string, Case> = {
  "01-rdfs-subclass-trans": {
    given: ":Fable rdfs:subClassOf :Conte . :Conte rdfs:subClassOf :RecitOral .",
    holds: [":Fable rdfs:subClassOf :RecitOral"],
  },
  "02-rdfs-type-inherit": {
    given: ":f a :Fable . :Fable rdfs:subClassOf :Conte . :Conte rdfs:subClassOf :RecitOral .",
    holds: [":f a :Conte", ":f a :RecitOral"],
  },
  "03-inverse-of-1": {
    given: ":estRecitDuSite owl:inverseOf :estAncreSur . :site :estRecitDuSite :r .",
    holds: [":r :estAncreSur :site"],
  },
  "04-inverse-of-2": {
    given: ":estRecitDuSite owl:inverseOf :estAncreSur . :r :estAncreSur :site .",
    holds: [":site :estRecitDuSite :r"],
  },
  "05-symmetric": {
    given: ":estLieA a owl:SymmetricProperty . :a :estLieA :b .",
    holds: [":b :estLieA :a"],
  },
  "06-site-multi-activites": {
    given: `:s1 a :SiteTouristique ; :proposeActivite :a, :b, :c .
            :s2 a :SiteTouristique ; :proposeActivite :a, :b .`,
    holds: [":s1 a :SiteMultiActivites"],
    absent: [":s2 a :SiteMultiActivites"],
  },
  "07-swrl-parle": {
    given: ":mossi a :Ethnie ; :aPourLangueMaternelle :moore .",
    holds: [":mossi :parle :moore"],
  },
  "08-swrl-habite-trans": {
    given: ":mossi a :Ethnie ; :habite :commune . :commune :estSitueeDans :province . :province :estSitueeDans :region .",
    holds: [":mossi :habite :province", ":mossi :habite :region"],
  },
  "09-swrl-instr-region": {
    given: ":bendre a :Instrument ; :estLocaliseDans :prov . :prov a :Localite ; :estSitueeDans :reg . :reg a :Region .",
    holds: [":bendre :estAssocieARegion :reg"],
  },
  "10-swrl-langue-lieu": {
    given: ":moore a :Langue ; :estParleePar :mossi . :mossi :habite :reg .",
    holds: [":moore :estParleeDans :reg"],
  },
  "11-swrl-dans-region": {
    given: ":com a :Localite ; :estSitueeDans :prov . :prov a :Province ; :estSitueeDans :reg . :reg a :Region .",
    holds: [":com :estDansRegion :reg"],
  },
  "12-swrl-plat-viande": {
    given: ":riz_gras a :Plat ; :aPourIngredient :mouton . :mouton a :Viande .",
    holds: [":riz_gras a :PlatAvecViande"],
  },
  "13-swrl-plat-elabore": {
    given: `:p1 a :Plat ; :aPourRecette :r1 . :r1 a :Recette ; :dureeRecette 180 .
            :p2 a :Plat ; :aPourRecette :r2 . :r2 a :Recette ; :dureeRecette 60 .`,
    holds: [":p1 a :PlatElabore"],
    absent: [":p2 a :PlatElabore"],
  },
  "14-swrl-plat-origine": {
    given: ":to a :Plat ; :estAssocieA :mossi . :mossi a :Ethnie ; :habite :ouaga . :ouaga a :Localite .",
    holds: [":to :estOriginaireDe :ouaga"],
  },
  "15-swrl-ingr-local": {
    given: ":to a :Plat ; :estOriginaireDe :ouaga ; :aPourIngredient :mil . :ouaga a :Localite . :mil :estCultiveDans :ouaga .",
    holds: [":to :aPourIngredientLocal :mil"],
  },
  "16-swrl-plat-rapide": {
    given: ":p1 a :Plat ; :tempsPreparationPlat 20 . :p2 a :Plat ; :tempsPreparationPlat 45 .",
    holds: [":p1 a :PlatRapide"],
    absent: [":p2 a :PlatRapide"],
  },
  "17-swrl-site-recomm": {
    given: ":s a :SiteTouristique ; :aPourPeriodeFavorable :seche . :seche a :Saison ; :estEnCours true .",
    holds: [":s :estRecommandeActuellement true"],
  },
  "18-swrl-site-access": {
    given: ":s a :SiteTouristique ; :estAccessibleEnSaisonSeche true . :seche a :Saison ; :estSaisonSeche true ; :estEnCours true .",
    holds: [":s :estAccessible true"],
  },
  "19-swrl-activite-lieu": {
    given: ":s a :SiteTouristique ; :estSitueDans :sabou ; :proposeActivite :visite .",
    holds: [":sabou :activiteDisponible :visite"],
  },
  "20-contes-localite-refl": {
    given: ":r :seDerouleDans :tenkodogo .",
    holds: [":r :seDerouleDansZone :tenkodogo"],
  },
  "21-contes-localite-trans": {
    given: ":r :seDerouleDansZone :tenkodogo . :tenkodogo :estSitueeDans :boulgou . :boulgou :estSitueeDans :nakambe .",
    holds: [":r :seDerouleDansZone :boulgou", ":r :seDerouleDansZone :nakambe"],
  },
  "22-contes-region": {
    given: ":r :seDerouleDansZone :nakambe, :boulgou . :nakambe a :Region .",
    holds: [":r :estRaconteDansRegion :nakambe"],
    absent: [":r :estRaconteDansRegion :boulgou"],
  },
  "23-contes-region-spatial": {
    given: ":r :seDerouleDansZone :bazoule . :bazoule :estDansRegion :oubri . :oubri a :Region .",
    holds: [":r :estRaconteDansRegion :oubri"],
  },
  "24-contes-ancrage": {
    given: ":r :estAncreSur :mare . :mare :estSitueDans :sabou .",
    holds: [":r :seDerouleDans :sabou", ":r a :RecitAncreSurSite"],
  },
  "25-contes-langues": {
    given: ":r :aPourVersion :v . :v :estRaconteeEn :moore .",
    holds: [":r :estDisponibleEnLangue :moore"],
  },
  "26-contes-multilingue": {
    given: `:r1 :estDisponibleEnLangue :fr, :moore, :dioula .
            :r2 :estDisponibleEnLangue :fr, :moore .`,
    holds: [":r1 a :RecitMultilingue"],
    absent: [":r2 a :RecitMultilingue"],
  },
  "27-contes-publiable": {
    given: `:ok a :RecitOral ; :consentementObtenu true ; :estRestreint false .
            :sacre a :RecitOral ; :consentementObtenu true ; :estRestreint true .
            :sans a :RecitOral ; :consentementObtenu false ; :estRestreint false .`,
    holds: [":ok a :RecitPubliable"],
    absent: [":sacre a :RecitPubliable", ":sans a :RecitPubliable"],
  },
  "28-contes-interactif": {
    given: ":r :aPourVersion :v . :v :aPourScene :s . :s :proposeChoix :c .",
    holds: [":r a :RecitInteractif"],
  },
  "29-contes-lies": {
    given: ":r1 :metEnScene :lievre . :r2 :metEnScene :lievre .",
    holds: [":r1 :estLieA :r2", ":r2 :estLieA :r1"],
    absent: [":r1 :estLieA :r1"],
  },
  "30-contes-parente": {
    given: ":r :provientDeEthnie :mossi ; :impliqueEthnie :samo . :mossi :aPourParentePlaisanterie :samo .",
    holds: [":r a :RecitDeParentePlaisanterie"],
  },
  "90-contes-langue-manquante": {
    given: `:mossi :aPourLangueMaternelle :moore .
            :r1 :provientDeEthnie :mossi .
            :r2 :provientDeEthnie :mossi ; :estDisponibleEnLangue :moore .`,
    holds: [":r1 :langueAEnregistrer :moore"],
    absent: [":r2 :langueAEnregistrer :moore"],
  },
};

describe("inference rules (SPARQL UPDATE)", () => {
  it("every rule file has a test case", () => {
    expect(RULES.map((r) => r.file.replace(/\.rq$/, "")).sort()).toEqual(
      Object.keys(CASES).sort(),
    );
  });

  it.each(Object.entries(CASES))("%s", (name, { given, holds, absent = [] }) => {
    const ask = infer(`${name}.rq`, given);
    for (const pattern of holds) expect(ask(pattern), `expected ${pattern}`).toBe(true);
    for (const pattern of absent) expect(ask(pattern), `unexpected ${pattern}`).toBe(false);
  });

  it("negation runs after the monotonic stratum reached its fixed point", () => {
    const store = new Store();
    store.load(
      `${PREFIXES}
       :mossi :aPourLangueMaternelle :moore .
       :r :provientDeEthnie :mossi ; :aPourVersion :v . :v :estRaconteeEn :moore .`,
      { format: "text/turtle" },
    );
    runInference(store, RULES);
    const ask = store.query(`${ASK_PREFIXES} ASK { :r :langueAEnregistrer :moore }`);
    expect(ask).toBe(false);
  });
});
