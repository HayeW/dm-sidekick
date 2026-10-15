# DM Cockpit — Requirements
## 1. Product
DM Cockpit is een mobile-first webapp voor een Dungeon Master (DM) tijdens een D&D-sessie.
De applicatie zelf bevat geen AI. AI wordt uitsluitend gebruikt tijdens de ontwikkeling van de software.
Productdoel
De DM moet tijdens een sessie zo min mogelijk bezig zijn met de applicatie en zo veel mogelijk met de spelers.
De belangrijkste UX-maatstaf is daarom het aantal handelingen dat nodig is voor veelvoorkomende acties.
De gewenste ervaring:
Open → Campaign → Scene → spelen.
Tijdens het spelen:
Kijken → tikken → doorgaan.
De app moet niet aanvoelen als een CRUD-database.
## 2. Scope v1
In scope
- Campaigns
- Scenes
- Scene content tiles
- Campaign NPCs
- Locations
- Encounters
- Player Characters
- Notes
- Quick Access
- Kant-en-klare NPC's (voorheen Random NPC)
- Combat
- Combatants
- HP management
- Combatant ordering
- Tijdelijke/persistente session state
Buiten scope
Voor v1:
- AI in de applicatie
- spelers-app
- multiplayer
- character builder
- volledige character sheets
- maps
- volledige rules engine
- uitgebreide monsterdatabase
- VTT-functionaliteit
- uitgebreide campaign/worldbuilding-functionaliteit
Conditions/statuses zijn voorlopig een nice-to-have en geen onderdeel van de kernscope.
## 3. Campaign
Een campaign is het primaire organisatorische object.
Een campaign bevat minimaal:
- Scenes
- Player Characters
- NPCs
- Locations
- Encounters
- Notes
Een NPC kan in meerdere scenes worden gebruikt.
Player Characters behoren bij een campaign.
Starten van een campaign
Wanneer de DM een bestaande campaign opent:
- De campaign wordt geladen.
- De laatst gebruikte scene wordt geopend.
Er is geen campaign-dashboard als tussenstap.
Wanneer een nieuwe campaign wordt geopend:
- De campaign wordt aangemaakt/geopend.
- De eerste scene wordt geopend.
## 4. Scene
Een scene is het centrale scherm tijdens een sessie.
Een scene bestaat uit compacte content tiles.
Voor v1 zijn onder andere de volgende tile-types voorzien:
- Descriptions / read-aloud (meerdere beschrijvingen per tile, bijv. "Intro" en "Aankomst bij het einde")
- Location
- NPCs
- Encounter
- DM Notes
Een tile toont compacte informatie in het scene-overzicht.
Wanneer een DM een tile opent:
- wordt de informatie duidelijk en leesbaar weergegeven;
- kan de DM met één actie terug naar het scene-overzicht.
Scenes hebben een expliciete volgorde.
De DM kan naar:
- vorige scene;
- volgende scene.
De laatst gebruikte scene wordt onthouden.
## 5. Tile actions
Informatie wordt normaal via een tile geopend.
Veelvoorkomende acties mogen rechtstreeks vanuit een tile beschikbaar zijn.
Voorbeeld:
Encounter 3 × Goblin 1 × Goblin Boss [ START COMBAT ] 
De DM hoeft niet eerst de encounter-detailpagina te openen om combat te starten.
Ontwerpprincipe:
Veelvoorkomende acties mogen niet onnodig achter detailpagina's of formulieren verborgen worden.
## 6. Quick Access
De applicatie heeft een universeel Quick Access-menu.
Quick Access is een escape hatch voor functionaliteit die niet direct onderdeel is van de huidige scene.
Mogelijke items:
- Combat
- Kant-en-klare NPC's
- Rules / references
- Campaign NPCs
- Campaign Locations
- Campaign Notes
- Global Notes
Quick Access is niet bedoeld als volledig hoofdmenu.
Kant-en-klare NPC's
Een vaste selectie van vooraf gemaakte NPC's, voor als het verhaal onverwacht een NPC nodig heeft. De selectie is globaal: in elke campaign dezelfde. Er wordt niets willekeurig gegenereerd.
De flow is:
Scene ↓ Quick Access ↓ Kant-en-klare NPC's ↓ lijst ↓ DM leest een NPC af en speelt verder
Een gebruikte NPC wordt niet bewaard of gemarkeerd; de lijst blijft hetzelfde.
De lijst hoeft niet permanent zichtbaar te zijn in de scene-UI.
## 7. Combat
Combat kan rechtstreeks vanuit een encounter worden gestart.
Bij het starten van combat:
- worden alle enemies uit de encounter toegevoegd;
- worden alle Player Characters van de campaign toegevoegd;
- worden de enemies alfabetisch gesorteerd;
- worden de Player Characters na de enemies geplaatst;
- is daarmee de initiële combatvolgorde bepaald.
Er worden geen dobbelstenen gerold.
Er is geen configuratiescherm tussen encounter en combat.
## 8. Combat order
De combatvolgorde is een geordende lijst van combatants.
De lijstvolgorde bepaalt de volgorde waarin combatants normaal gesproken handelen.
Bij het starten van combat worden de enemies alfabetisch gesorteerd. Genummerde enemies staan in natuurlijke volgorde ("Goblin 2" vóór "Goblin 10"); hoofdletters tellen niet mee.
Player Characters komen in campaign-volgorde na de enemies.
De applicatie kent geen initiative: de DM zet combatants zelf op de juiste plek.
De DM kan Player Characters handmatig omhoog en omlaag verplaatsen.
De DM kan ook iedere andere combatant handmatig verplaatsen.
## 9. Turns
De applicatie houdt in v1 geen actieve beurt bij.
Er is:
- geen actieve combatant;
- geen END TURN;
- geen automatische beurtwisseling;
- geen automatische interpretatie van turns.
Alle combatants kunnen op ieder moment worden aangepast.
De DM bepaalt zelf het verloop van de combat.
## 10. HP
HP moet rechtstreeks vanuit de combatlijst aangepast kunnen worden.
HP wordt alleen bijgehouden voor enemies en andere niet-speler-combatants. Voor Player Characters wordt geen HP bijgehouden; de spelers houden hun eigen HP bij.
De primaire interactie is gebaseerd op directe knoppen, bijvoorbeeld:
Goblin 24 HP [ −1 ] [ −5 ] [ −10 ] [ +1 ] [ +5 ] [ +10 ] 
De exacte healing-controls zijn nog niet definitief vastgesteld.
Het volgende patroon moet worden vermeden:
Combat → Character → HP → waarde invoeren → bevestigen 
De gewenste interactie is:
Combat → [ −5 ] 
## 11. Dead combatants
Wanneer een combatant 0 HP bereikt:
- blijft de combatant zichtbaar;
- blijft de combatant op zijn positie in de lijst;
- wordt de combatant niet automatisch verwijderd;
- wordt de combatant niet automatisch overgeslagen;
- bepaalt de DM zelf wat er vervolgens gebeurt.
De applicatie hoeft DEAD niet gelijk te stellen aan "niet meer relevant voor combat".
Een mogelijke presentatie is:
Goblin DEAD 
## 12. Combatants toevoegen
De DM kan tijdens een actieve combat een nieuwe combatant toevoegen.
Bij toevoegen:
- wordt de nieuwe combatant niet alfabetisch ingevoegd, maar onderaan de lijst geplaatst;
- kan de DM de combatant daarna handmatig verplaatsen.
Dezelfde ordering-mechaniek wordt gebruikt voor Player Characters en andere combatants.
## 13. Combatants verwijderen
De DM kan tijdens combat een combatant verwijderen.
De app hoeft niet automatisch te bepalen wanneer een combatant verwijderd moet worden.
## 14. Navigatie tijdens combat
De DM kan tijdens een actieve combat naar andere delen van de applicatie navigeren.
Bijvoorbeeld:
Combat → Scene → NPC → Scene → Combat 
Wanneer de DM terugkeert naar combat, wordt de bestaande combat-state behouden.
Minimaal moet behouden blijven:
- combatants;
- volgorde;
- HP;
- dead-status;
- handmatig toegevoegde combatants.
## 15. Session state
Actieve combat is tijdelijke session state.
De state moet echter niet verloren gaan door bijvoorbeeld:
- browser refresh;
- applicatie sluiten;
- tijdelijk verlaten van de applicatie.
De actuele combat-state moet daarom lokaal persistent worden opgeslagen.
De exacte lifecycle van deze state is nog niet definitief bepaald.
## 16. Combat lifecycle
Gewijzigd door de product owner op 2026-10-15 (DC-072, DC-073).
De DM kan een combat beëindigen met een End combat-actie op het combatscherm. Daarna kan in de campaign weer een combat worden gestart.
De DM kan ook een ander encounter starten terwijl een combat loopt; die vervangt de lopende combat.
Beide vragen eerst om bevestiging, omdat de combat-state (HP, volgorde) verloren gaat.
De DM kan na afloop van een combat ook gewoon teruggaan naar de scene; de combat blijft dan actief.
## 17. UX-richtlijnen
Voor veelvoorkomende acties gelden de volgende richtlijnen:
ActieDoelCampaign → huidige scene1 actie na campaign-selectieIntro bekijken1 tapVorige/volgende scene1 tapNPC bekijken±2 tapsEncounter starten±2 tapsHP aanpassen1 tapVeelgebruikte combatactiezo weinig mogelijk taps
Zeldzame acties mogen meer handelingen kosten.
De DM moet zoveel mogelijk context kunnen behouden zonder steeds via een hoofdmenu te navigeren.
## 18. Ontwerpprincipes
Context boven administratie
Dezelfde informatie en acties moeten beschikbaar zijn vanuit de context waarin de DM ze nodig heeft.
Voorbeeld:
Campaign ↓ Scene ↓ Encounter ↓ Combat 
De DM hoeft niet telkens terug naar een centraal menu.
DM bepaalt
De applicatie ondersteunt de DM, maar probeert niet alle D&D-regels af te dwingen.
De app mag praktische ondersteuning bieden zonder de DM te verplichten om iedere spelbeslissing formeel in te voeren.
Snelheid boven volledigheid
Een eenvoudige flow met weinig handelingen heeft de voorkeur boven een volledig administratief model.
Geen onnodige CRUD
De applicatie moet voelen als een cockpit tijdens een sessie, niet als een databasebeheerapplicatie.
## 19. Aannames
De volgende aannames zijn momenteel gemaakt:
- De applicatie wordt primair gebruikt op een mobiel apparaat.
- Eén DM gebruikt de applicatie tijdens een sessie.
- Multiplayer is geen onderdeel van v1.
- Combat wordt normaal gesproken binnen één speelsessie afgerond.
- Een browser refresh mag geen actieve combat-state verliezen.
- Lokale persistence is voldoende voor session state in v1.
- De applicatie rolt geen dobbelstenen en kent geen initiative.
- De alfabetische beginvolgorde is een startpunt; de DM bepaalt de uiteindelijke combatvolgorde handmatig.
- De DM is verantwoordelijk voor correcte interpretatie van D&D-regels.
- Een combatant met 0 HP hoeft niet automatisch uit de combatvolgorde te verdwijnen.
- Combat beëindigen is niet verplicht; de DM kan het doen om een nieuw encounter te starten (DC-072, DC-073).
- Conditions kunnen later worden toegevoegd zonder het basis-combatmodel fundamenteel te wijzigen.
## 20. Open vragen
Deze vragen zijn nog niet definitief beantwoord.
Persistence
- Hoe lang moet een actieve combat persistent blijven?
- Wat moet er gebeuren wanneer de DM de campaign een week later opent?
- Moet session state gekoppeld zijn aan een expliciete sessie?
- Wanneer mag oude combat-state worden verwijderd?
Combat
- Hoe ziet de UI voor "Add combatant" precies uit?
- Welke gegevens zijn minimaal nodig om een combatant toe te voegen?
- Hoe werkt het verwijderen van een combatant UX-technisch?
- Zijn +1/+5/+10 healing-knoppen inderdaad gewenst?
- Moet HP onder 0 kunnen gaan of wordt dit op 0 begrensd?
- Hoe wordt een combatant visueel als DEAD weergegeven?
- Hoe worden duplicate combatants onderscheiden? Bijvoorbeeld drie Goblins.
Scene
- Hoe ziet de navigatie naar vorige/volgende scene precies uit?
- Wat gebeurt er wanneer een scene geen vorige of volgende scene heeft?
- Kunnen scenes tijdens een sessie worden toegevoegd of herordend?
Quick Access
- Welke Quick Access-items zijn daadwerkelijk noodzakelijk voor v1?
- Waar en hoe wordt Quick Access geopend?
Data
- Welke velden zijn minimaal nodig voor:
- Campaign
- Scene
- NPC
- Location
- Encounter
- Player Character
- Combatant
- Note
- Hoe worden NPCs gekoppeld aan scenes?
- Hoe worden enemies in encounters gemodelleerd?
Deze open vragen hoeven niet allemaal vooraf opgelost te worden. Alleen vragen die een concrete implementatie blokkeren moeten vóór de betreffende feature worden beantwoord.

# Eerste domeinmodel
Dit is bewust een conceptueel model, niet meteen een database-schema. Ik zou de AI juist eerst hiermee laten werken en pas later persistence details laten bepalen.
DM Cockpit — Eerste domeinmodel
DM Cockpit — Eerste domeinmodel
## 1. Overzicht
Campaign ├── Scene[] ├── PlayerCharacter[] ├── NPC[] ├── Location[] ├── Encounter[] └── Note[] 
Een actieve combat ontstaat vanuit een Encounter, maar is een afzonderlijke runtime/session state.
Encounter │ │ start ▼ Combat │ └── Combatant[] 
## 2. Campaign
Campaign - id - name - scenes - playerCharacters - npcs - locations - encounters - notes - lastUsedSceneId 
Verantwoordelijkheid
Een Campaign groepeert alle langdurige campaign-data.
## 3. Scene
Scene - id - campaignId - title - order - contentBlocks[] 
Een Scene heeft een vaste positie binnen een Campaign.
Content
Een Scene bestaat uit content blocks/tiles.
Mogelijke types:
Descriptions Location NPCs Encounter DMNotes 
Een Descriptions-block bevat een geordende lijst beschrijvingen; elke beschrijving heeft een eigen titel en tekst.
Het exacte model van contentBlocks is nog open.
## 4. PlayerCharacter
PlayerCharacter - id - campaignId - name 
Voor v1 is geen volledige character sheet nodig.
Player Characters worden bij het starten van combat automatisch toegevoegd.
## 5. NPC
NPC - id - campaignId - name - ... 
Een NPC kan door meerdere scenes worden gebruikt.
De exacte NPC-properties zijn nog open.
## 6. Location
Location - id - campaignId - name - description 
De exacte properties zijn nog open.
## 7. Encounter
Encounter - id - campaignId - name - enemies[] 
Een Encounter beschrijft welke enemies bij het starten van combat aanwezig zijn.
Het exacte enemy-model is nog open.
## 8. Combat
Combat is tijdelijke runtime/session state.
Combat - id - sceneId - combatants[] 
Een Combat bevat een geordende lijst van Combatants.
De positie in combatants bepaalt de huidige combatvolgorde.
Er is geen actieve-turn-property nodig voor v1.
Er is ook geen status = active/completed vereist voor de basisflow.
## 9. Combatant
Een Combatant representeert een deelnemer aan een specifieke combat.
Combatant - id - name - type - hp - maxHp? - state 
Mogelijke type:
PLAYER ENEMY NPC 
Mogelijke state:
ACTIVE DEAD 
De exacte properties moeten nog worden vastgesteld.
Belangrijk
Een Combatant is niet noodzakelijk hetzelfde object als een PlayerCharacter of NPC.
Een PlayerCharacter is campaign-data.
Een Combatant is een deelname van een entiteit aan één specifieke combat.
Dit onderscheid voorkomt dat bijvoorbeeld:
Alice HP 12 tijdens combat 
per ongeluk de permanente campaign-data van Alice verandert.
## 10. Combat order
Er hoeft geen order property op Combatant te staan als de gebruikte technologie een geordende collectie ondersteunt.
Bijvoorbeeld:
Combat combatants = [ goblin, alice, boss, bob ] 
De positie in de collectie is dan de volgorde.
Bij toevoegen:
combatants.push(newCombatant) 
Bij omhoog verplaatsen worden twee elementen verwisseld.
## 11. Initiële volgorde
De applicatie kent geen initiative en rolt geen dobbelstenen.
Bij het starten van combat:
Enemy[] ↓ sorteer alfabetisch (natuurlijke volgorde) ↓ + PlayerCharacter[] ↓ Combat.combatants 
Daarna is de lijstvolgorde leidend.
Dit is een bewuste vereenvoudiging.
## 12. Session state
Naast campaign-data bestaat tijdelijke applicatiestate:
SessionState - campaignId - currentSceneId - activeCombatId? 
De actieve Combat bevat vervolgens de combat-state.
Een mogelijke persistence-structuur is:
Campaign data + SessionState + Active Combat 
De precieze persistence-technologie is nog niet bepaald.
## 13. Relaties
Conceptueel:
Campaign │ ├── Scene[] │ │ │ ├── ContentBlock[] │ └── Encounter references │ ├── PlayerCharacter[] │ ├── NPC[] │ ├── Location[] │ ├── Encounter[] │ └── Note[] Scene │ └── active Combat │ └── Combatant[] 
NPCs en Locations kunnen door meerdere Scenes worden gerefereerd.
## 14. Belangrijke modelkeuzes
Combatant ≠ Campaign entity
Een PlayerCharacter of NPC bestaat onafhankelijk van een specifieke combat.
Een Combatant is een tijdelijke representatie binnen een combat.
Order in plaats van initiative
De DM werkt met een geordende lijst.
De initiële volgorde is alfabetisch (enemies) gevolgd door de Player Characters; daarna ordent de DM handmatig.
Geen Turn entity
Er is geen apart Turn-model nodig voor v1.
Geen Combat lifecycle nodig
Omdat er geen expliciete End Combat-flow is, hoeft Combat in eerste instantie geen complexe lifecycle te hebben.
Geen D&D rules engine
Het domeinmodel moet niet proberen alle D&D-regels te modelleren.
Kleine implementable user stories
Hier zou ik bewust kleine stories van maken. Een coding agent moet idealiter één story kunnen oppakken zonder dat hij het hele product opnieuw moet begrijpen.

# DM Cockpit — Implementable User Stories
Conventies
Prioriteiten:
- P0 — noodzakelijk voor een eerste werkende slice
- P1 — nodig voor de kern-v1
- P2 — later / nice-to-have
Elke story moet bij voorkeur zelfstandig testbaar zijn.
## Epic 1 — Campaign
### DC-001 — Campaigns tonen
P0
Als DM wil ik mijn campaigns kunnen zien zodat ik een campaign kan kiezen.
Acceptance criteria
- Er is een campaign-lijst.
- Iedere campaign heeft minimaal een naam.
- Een campaign kan geselecteerd worden.
### DC-002 — Campaign openen
P0
Als DM wil ik een campaign kunnen openen zodat ik ermee kan spelen.
Acceptance criteria
- Een geselecteerde campaign wordt geopend.
- De app bepaalt welke scene geopend moet worden.
### DC-003 — Laatst gebruikte scene onthouden
P0
Als DM wil ik na het openen van een campaign direct terugkomen op de laatst gebruikte scene.
Acceptance criteria
- De huidige scene wordt opgeslagen.
- Bij opnieuw openen van de campaign wordt deze scene geopend.
### DC-004 — Nieuwe campaign opent eerste scene
P1
Als DM wil ik bij een nieuwe campaign direct de eerste scene zien.
Acceptance criteria
- Een campaign met scenes heeft een eerste scene.
- Bij openen wordt deze scene getoond.
## Epic 2 — Scenes
### DC-010 — Scene tonen
P0
Als DM wil ik de content van een scene als tiles zien.
Acceptance criteria
- De scene toont zijn content blocks.
- Tiles zijn compact weergegeven.
- De belangrijkste tile-types kunnen worden weergegeven.
### DC-011 — Descriptions tile openen
P0
Als DM wil ik de beschrijvingen van een scene kunnen openen en ertussen kunnen wisselen, zodat ik elke read-aloud tekst goed kan voorlezen.
Acceptance criteria
- Een Descriptions tile bevat één of meer beschrijvingen (bijv. "Intro" en "Aankomst bij het einde"), elk met een eigen titel en tekst.
- Een Descriptions tile kan met één tap worden geopend; de eerste beschrijving wordt getoond.
- De DM kan met één tap naar de vorige of volgende beschrijving; bij de eerste/laatste is die knop uitgeschakeld.
- De tekst wordt leesbaar weergegeven.
- De DM kan met één actie terug naar de scene.
### DC-012 — Location tile openen
P1
Als DM wil ik een Location tile kunnen openen.
### DC-013 — NPC tile openen
P1
Als DM wil ik NPC-informatie vanuit de scene kunnen bekijken.
### DC-014 — Notes tile openen
P1
Als DM wil ik DM Notes vanuit de scene kunnen bekijken.
### DC-015 — Vorige scene openen
P0
Als DM wil ik met één actie naar de vorige scene kunnen gaan.
Acceptance criteria
- De vorige scene wordt geopend.
- De nieuwe scene wordt de current scene.
### DC-016 — Volgende scene openen
P0
Als DM wil ik met één actie naar de volgende scene kunnen gaan.
Acceptance criteria
- De volgende scene wordt geopend.
- De nieuwe scene wordt de current scene.
### DC-017 — Swipen tussen beschrijvingen
P1
Als DM wil ik op mobiel tussen beschrijvingen kunnen swipen, zodat ik naar de vorige of volgende beschrijving kan zonder naar de knoppen te reiken.
Acceptance criteria
- Naar links swipen opent de volgende beschrijving.
- Naar rechts swipen opent de vorige beschrijving.
- Bij de eerste/laatste beschrijving gebeurt er niets.
- Verticaal scrollen door een lange tekst of inzoomen met twee vingers wordt niet als swipe gezien.
- Swipen werkt hetzelfde als de Previous/Next-knoppen, die beschikbaar blijven.
## Epic 3 — Quick Access
### DC-020 — Quick Access openen
P1
Als DM wil ik Quick Access vanuit de applicatie kunnen openen.
### DC-021 — Quick Access items tonen
P1
Als DM wil ik beschikbare Quick Access-functies kunnen kiezen.
Voor v1 kunnen dit onder andere zijn:
- Combat
- Kant-en-klare NPC's
- Campaign NPCs
- Campaign Locations
- Campaign Notes
De definitieve lijst is nog open.
## Epic 4 — Campaign entities
### DC-030 — Player Character aanmaken
P1
Als DM wil ik een Player Character aan een campaign kunnen toevoegen.
### DC-031 — Player Characters bekijken
P1
Als DM wil ik de Player Characters van een campaign kunnen bekijken.
### DC-032 — NPC aanmaken
P1
Als DM wil ik een NPC aan een campaign kunnen toevoegen.
### DC-033 — NPC hergebruiken in scenes
P1
Als DM wil ik een bestaande NPC aan meerdere scenes kunnen koppelen.
### DC-034 — Location aanmaken
P1
Als DM wil ik een Location aan een campaign kunnen toevoegen.
## Epic 5 — Encounters
### DC-040 — Encounter aanmaken
P1
Als DM wil ik een encounter kunnen definiëren.
### DC-041 — Enemies aan encounter toevoegen
P1
Als DM wil ik kunnen bepalen welke enemies onderdeel zijn van een encounter.
### DC-042 — Encounter tile tonen
P1
Als DM wil ik een encounter als tile in een scene kunnen zien.
### DC-043 — Combat rechtstreeks starten
P0
Als DM wil ik vanuit een encounter direct combat kunnen starten.
Acceptance criteria
- Alle enemies uit de encounter worden toegevoegd.
- Alle Player Characters uit de campaign worden toegevoegd.
- Er is geen configuratiescherm tussen encounter en combat.
## Epic 6 — Combat initialization
### DC-050 — Initiële enemy-volgorde
P0
Als DM wil ik dat de enemies bij het starten van combat in een voorspelbare volgorde staan.
Acceptance criteria
- Enemies worden alfabetisch gesorteerd, zonder onderscheid tussen hoofdletters en kleine letters.
- Genummerde enemies staan in natuurlijke volgorde: "Goblin 2" vóór "Goblin 10".
- Enemies met dezelfde naam (op hoofdletters na) houden de volgorde uit de encounter.
- Er wordt geen dobbelsteen gerold.
- Player Characters komen na de enemies (DC-051).
### DC-051 — Player Characters toevoegen aan combat
P0
Als DM wil ik dat alle campaign Player Characters automatisch aan combat worden toegevoegd.
### DC-052 — Player Characters handmatig ordenen
P0
Als DM wil ik Player Characters omhoog en omlaag kunnen verplaatsen.
### DC-053 — Combatant-volgorde tonen
P0
Als DM wil ik alle combatants in hun huidige volgorde kunnen zien.
## Epic 7 — Combat management
### DC-060 — HP tonen
P0
Als DM wil ik de actuele HP van iedere combatant die geen Player Character is kunnen zien.
Acceptance criteria
- Iedere enemy/NPC-combatant toont zijn actuele HP.
- Player Characters tonen geen HP en hebben geen HP-controls.
### DC-061 — Damage toepassen
P0
Als DM wil ik direct damage kunnen toepassen via vaste knoppen.
Acceptance criteria
- Er zijn minimaal damage-controls voor 1, 5 en 10.
- De HP wordt direct aangepast.
- Er is geen bevestigingsscherm nodig.
### DC-062 — Healing toepassen
P1
Als DM wil ik direct healing kunnen toepassen.
Acceptance criteria (vastgesteld door de product owner op 2026-10-13)
- Er zijn healing-controls voor 1, 5 en 10.
- Healing gebeurt in een aparte heal-modus die de DM aan- en uitzet; de damage-controls blijven in de normale modus.
- De HP wordt direct aangepast, zonder bevestigingsscherm.
- De HP komt nooit boven de maximale HP.
- Een combatant met 0 HP (dead) kan worden gehealed en is daarna niet meer dead.
- Player Characters hebben geen HP en dus geen healing-controls.
### DC-063 — Dead combatant markeren
P0
Als DM wil ik kunnen zien dat een combatant 0 HP heeft bereikt.
Acceptance criteria
- De combatant blijft zichtbaar.
- De combatant blijft op dezelfde positie.
- De combatant wordt niet automatisch verwijderd.
### DC-064 — Combatant verplaatsen
P0
Als DM wil ik iedere combatant omhoog of omlaag kunnen verplaatsen.
### DC-065 — Combatant toevoegen
P0
Als DM wil ik tijdens combat een combatant kunnen toevoegen.
Acceptance criteria
- Een nieuwe combatant wordt aangemaakt.
- De combatant wordt onderaan geplaatst, niet alfabetisch ingevoegd.
### DC-066 — Nieuwe combatant verplaatsen
P0
Als DM wil ik een nieuw toegevoegde combatant naar de juiste positie kunnen verplaatsen.
### DC-067 — Combatant verwijderen
P1
Als DM wil ik een combatant uit de huidige combat kunnen verwijderen.
## Epic 8 — Combat navigation
### DC-070 — Combat verlaten zonder state te verliezen
P0
Als DM wil ik vanuit combat naar andere informatie kunnen navigeren.
### DC-071 — Terugkeren naar actieve combat
P0
Als DM wil ik bij terugkeer naar combat dezelfde combat-state zien.
Acceptance criteria
- Combatants zijn hetzelfde.
- Volgorde is hetzelfde.
- HP is hetzelfde.
- Dead-status is hetzelfde.
- Handmatig toegevoegde combatants zijn nog aanwezig.
### DC-072 — Combat beëindigen
P1
Toegevoegd door de product owner op 2026-10-15.
Als DM wil ik een combat kunnen beëindigen, zodat ik daarna een ander encounter kan starten.
Acceptance criteria
- Het combatscherm heeft een End combat-actie.
- De app vraagt om bevestiging, omdat de combat-state (HP, volgorde, toegevoegde combatants) verloren gaat. Dit is een bewuste uitzondering op "geen bevestigingsschermen", zoals bij verwijderen (DC-113).
- Bij annuleren verandert er niets.
- Na het beëindigen is er geen actieve combat meer: elke encounter tile toont weer Start combat, en Quick Access toont Combat als niet beschikbaar.
- De beëindigde combat komt niet terug na een refresh.
### DC-073 — Ander encounter starten tijdens een combat
P1
Toegevoegd door de product owner op 2026-10-15.
Als DM wil ik een ander encounter kunnen starten terwijl er nog een combat loopt, zodat ik niet eerst naar het combatscherm hoef om die te beëindigen.
Acceptance criteria
- De encounter tile van het lopende encounter toont Resume combat, zoals nu (DC-071).
- De tile van elk ander encounter toont Start combat.
- Start combat vraagt dan eerst om bevestiging, met de naam van de lopende combat; bij bevestigen vervangt de nieuwe combat de lopende, bij annuleren verandert er niets.
- Zonder lopende combat start Start combat direct, zonder bevestiging (DC-043).
## Epic 9 — Persistence
### DC-080 — Current scene lokaal bewaren
P0
Als DM wil ik dat mijn huidige scene behouden blijft na een refresh.
### DC-081 — Combat lokaal bewaren
P0
Als DM wil ik dat een actieve combat niet verloren gaat wanneer ik de applicatie sluit en opnieuw open.
### DC-082 — Combat state herstellen
P0
Als DM wil ik na het opnieuw openen van de applicatie de eerder opgeslagen combat-state kunnen herstellen.
Acceptance criteria
Minimaal behouden:
- combatants;
- volgorde;
- HP;
- dead-status.
## Epic 10 — Kant-en-klare NPC's
Gewijzigd door de product owner op 2026-10-13. Eerst "Random NPC": een NPC genereren, aan de campaign toevoegen of weggooien. Nu een vaste, globale selectie vooraf gemaakte NPC's. DC-091 en DC-092 vervallen.
### DC-090 — Kant-en-klare NPC's bekijken
P1
Als DM wil ik via Quick Access een selectie kant-en-klare NPC's kunnen bekijken, zodat ik er snel één kan gebruiken als het verhaal onverwacht een NPC nodig heeft.
Acceptance criteria
- De selectie is globaal: in elke campaign dezelfde.
- Iedere NPC heeft een naam, een ras en een zeer korte beschrijving (één of twee zinnen).
- De lijst toont van iedere NPC naam, ras en beschrijving, zodat de DM niets hoeft te openen.
- De lijst is vanuit elk scherm binnen een campaign met twee taps bereikbaar (Quick Access).
- Er wordt niets willekeurig gegenereerd; de selectie wordt met de app meegeleverd.
- Een gebruikte NPC wordt niet bewaard of gemarkeerd; de lijst blijft hetzelfde.
### DC-091 — Vervallen
Was: Random NPC bewaren.
### DC-092 — Vervallen
Was: Random NPC weggooien.
## Epic 11 — UX quality
### DC-100 — Mobile-first layout
P0
Als DM wil ik de applicatie comfortabel op een mobiel scherm kunnen gebruiken.
### DC-101 — Veelgebruikte acties direct beschikbaar
P0
Als DM wil ik veelgebruikte acties zonder onnodige navigatiestappen kunnen uitvoeren.
### DC-102 — Context behouden bij navigatie
P0
Als DM wil ik vanuit een context naar andere informatie kunnen navigeren zonder mijn huidige werk kwijt te raken.
## Epic 12 — Campaign importeren
Toegevoegd door de product owner op 2026-10-13. De DM bereidt een campaign voor op de PC, in een Markdown-bestand, en importeert dat bestand op het apparaat waarop gespeeld wordt. Het formaat staat beschreven in docs/campaign-format.md. Bewerken in de app (Epic 4 en 5) kan later; import en export blijven dan de manier om een campaign van de PC naar de telefoon te krijgen.
### DC-110 — Campaign importeren uit een Markdown-bestand
P1
Als DM wil ik een campaign die ik op de PC heb voorbereid in een Markdown-bestand kunnen importeren, zodat ik hem tijdens de sessie op mijn telefoon kan gebruiken.
Acceptance criteria
- Vanuit de campaign-lijst kan de DM een Markdown-bestand op het apparaat kiezen.
- De campaign wordt gelezen volgens het formaat in docs/campaign-format.md: scenes met tiles, Player Characters, NPC's, locations, encounters en campaign notes.
- Na het importeren staat de campaign in de campaign-lijst en kan hij worden geopend zoals elke andere campaign.
- De campaign wordt lokaal bewaard en blijft na een refresh of het sluiten van de app beschikbaar.
- De demo campaigns blijven beschikbaar.
### DC-111 — Bestaande campaign vervangen
P1
Als DM wil ik een campaign opnieuw kunnen importeren nadat ik het bestand heb aangepast, zodat de nieuwe versie de oude vervangt.
Acceptance criteria
- Een campaign met dezelfde naam als een eerder geïmporteerde campaign geldt als dezelfde campaign.
- Voordat die wordt vervangen, vraagt de app om bevestiging. Dit is een bewuste uitzondering op "geen bevestigingsschermen": importeren is zeldzaam en vervangt alles.
- Bij annuleren verandert er niets.
### DC-112 — Duidelijke foutmeldingen bij importeren
P1
Als DM wil ik bij een fout in het bestand precies zien wat er mis is en waar, zodat ik het snel kan verbeteren.
Acceptance criteria
- Bij een fout wordt er niets geïmporteerd of vervangen.
- De melding noemt het regelnummer en wat er mis is, bijvoorbeeld een verwijzing naar een NPC die niet bestaat.
- Alle gevonden fouten worden tegelijk getoond, niet alleen de eerste.
### DC-113 — Geïmporteerde campaign verwijderen
P1
Als DM wil ik een geïmporteerde campaign kunnen verwijderen, bijvoorbeeld de oude versie nadat ik een campaign een andere naam heb gegeven.
Acceptance criteria
- Alleen geïmporteerde campaigns kunnen worden verwijderd, de demo campaigns niet.
- De app vraagt om bevestiging voordat de campaign wordt verwijderd.
- Ook de opgeslagen session state van die campaign (laatste scene, actieve combat) wordt verwijderd.
### DC-114 — Eigen Player Characters bij een gedeelde campaign
P1
Toegevoegd door de product owner op 2026-10-15.
Als DM wil ik de Player Characters van een campaign in de app zelf kunnen beheren, zodat ik een campaign-bestand kan gebruiken dat ik met andere DM's deel, ook al speelt iedere DM met andere spelers.
Acceptance criteria
- De Player Characters horen bij één campaign op dit apparaat; iedere campaign heeft zijn eigen lijst. Dit geldt voor alle campaigns, ook de demo campaigns, zodat die werken zoals echte campaigns.
- De DM kan in de app een Player Character toevoegen (op naam), een naam wijzigen en een Player Character verwijderen.
- Player Characters worden niet uit het campaign-bestand gelezen. Een bestand met een sectie "## Player characters" geeft een foutmelding (DC-112). Dit vervangt "Player Characters" in de acceptance criteria van DC-110.
- Bij opnieuw importeren (DC-111) blijft de lijst van de DM ongewijzigd.
- Bij het verwijderen van een campaign (DC-113) wordt ook zijn lijst Player Characters verwijderd.
- Combat neemt de Player Characters van de campaign over bij het starten (DC-051). Een wijziging in de lijst verandert een lopende combat niet.
- De lijst blijft na een refresh of het sluiten van de app bewaard.
Niet gepland voor v1
De volgende features krijgen geen implementation story voor de eerste versie:
- AI in de applicatie
- multiplayer
- players-app
- volledige character sheets
- character builder
- maps
- VTT
- volledige rules engine
- uitgebreide monsterdatabase
- conditions/statuses
- uitgebreide campaign/worldbuilding
Deze kunnen later als afzonderlijke epics worden toegevoegd.
Eerste aanbevolen implementatievolgorde
Voor een eerste verticale slice:
- DC-001 — Campaigns tonen
- DC-002 — Campaign openen
- DC-010 — Scene tonen
- DC-011 — Descriptions tile openen
- DC-015 — Vorige scene
- DC-016 — Volgende scene
- DC-043 — Combat starten
- DC-050 — Initiële enemy-volgorde
- DC-051 — Players toevoegen
- DC-053 — Combatvolgorde tonen
- DC-060 — HP tonen
- DC-061 — Damage toepassen
- DC-063 — Dead markeren
- DC-064 — Combatant verplaatsen
- DC-065 — Combatant toevoegen
- DC-067 — Combatant verwijderen
- DC-071 — Combat-state herstellen
Dit levert relatief snel een echte end-to-end flow op:
Campaign ↓ Scene ↓ Encounter ↓ Start Combat ↓ Combat ↓ Damage ↓ Add / move combatant ↓ Leave combat ↓ Return to combat 
Een belangrijke vervolgstap
Ik zou nu nog niet aan de coding agent vragen om de hele app te bouwen. We hebben namelijk nog een mooie kans om AI-assisted development goed aan te pakken.
De volgende stap kan een eerste experiment zijn:
Geef de coding agent alleen requirements.md en het domeinmodel, en laat hem een implementatieplan maken voor de eerste vertical slice — zonder code te schrijven.
Dan kunnen we samen zijn plan reviewen. Daarna laten we hem één kleine story daadwerkelijk implementeren.
Zo leer je niet alleen code genereren met AI, maar vooral de vaardigheid die waarschijnlijk veel belangrijker wordt: een AI-agent zodanig begrenzen en sturen dat hij betrouwbaar software kan ontwikkelen.