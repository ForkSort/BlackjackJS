'use strict';
/** Game class - Blackjack kjerne. 
 * Er i hovedsak bare en primitiv "state-machine", den delegerer mesteparten av logikk til instanser av Deck(), Dealer(), Player(). */
class Game {
    #rules;
    #state;
    players = [];
    /**
     * @param {Object} rules - Tilpassede spille-regler (valgfri)
     * @param {Object} minbet - Minimum bet (valgfri default: 1)
     */
     constructor(rules = blackjackrules.classic, minbet = 1) {
        this.#rules = rules; // import rules
        this.#rules.minbet = minbet;
        this.#rules.maxbet = minbet*50;
        this.#state = "init"; // set state "init"
        this.deck = new Deck(this.#rules.decks);
        this.dealer = new Dealer();
        this.players.push(new Player());
    }
    get rules() {
        return this.#rules;
    }
    get state() {
        return this.#state;
    }
    /**
     * Mottas fra player.deal() fører till kort-utdeling. 
     * @returns {Object} {balance: players-balance, cardsleft}
     * @param {number} playerId - (valgfri) Default: 0. Denne funksjonaliteten er ikke i bruke (ennå)
     */
    playerReady(playerId = 0) {
        if (this.#state !== "init") return false;
        this.#state = "deal";
        return {balance: this.players[playerId].balance}
        //return this.draw();
    }
    /**
     * Deler ut de første kortene. I klokkevis rekkefølge: 1-kort til hver spiller og 1-kort til dealeren (med verdi-side opp), deretter 1-kort til hver spiller (med verdi-side opp), og 1-kort til dealeren med verdi-side ned.
     * - Forutsetninger: a) #state: "deal"
     * - Side-effekter: Setter #state til: "peek". Flytter kort fra deck.shoe til deck.inplay
     * @returns {Object} 
     *  - {playersCard1: [{card: v value: v}...]}
     * - "dealerCard1":{card: v, value: v},
     * - {playersCard2: [{card: v, value: v}...]},
     * - "dealerCard2":{card: hidden, value: hidden}
     */
    draw() { // draws and returns the first 4 cards
        if (this.#state !== "deal") return false;
        this.#state = "peek";
        let result = {
            playersCard1: [],
            dealerCard1: [],
            playersCard2: [],
            dealerCard2: [],
        };
        // del ut kort sålenge dealer.hand har mindre enn 2 kort
        while (this.dealer.hand.cards.length < 2) {
            // loop gjennom spillere, begynn med siste spiller, og del ut kort til hver.
            for (let i = this.players.length-1; i >= 0; i--) {
                result[`playersCard${(this.dealer.hand.cards.length%2)+1}`].push(
                    {card: this.players[i].hands[0].addCard(game.deck.next()).card(),
                    value: Object.assign({}, this.players[i].hands[0].value)
                });
            }
            // del ut kort til dealeren. For å vise baksiden av det andre kortet trenger .card() metode parameter 2 å være false.
            // Og så, addCard() oppdaterer hand.value vanligvis, men hvis parameter 2 er false da gjør den ikke det. 'x.length%2' er false dersom x er ett partall da bruker vi det her.
            result[`dealerCard${(this.dealer.hand.cards.length%2)+1}`] =
                    {card: this.dealer.hand
                    .addCard(game.deck.next(),!this.dealer.hand.cards.length%2) // sett det andre parameteret til addCard() til false for kort nr2.
                    .card(this.dealer.hand.cards.length%2),
                    value: Object.assign({}, this.dealer.hand.value)
            };  // sett det andre parameteret til addCard() til false for kort nr2.
        }
        return result;
    }
    /**
     - Denne metoden er ikke implementert ennå.
     * Det den skal gjøre er: sjekke om dealers første kort er 'A' hvis den er det: og hvis rules.peeks === true: tilby forsikrings sidebet (halvparten av baseBet).
     - Forutsetninger: a) #state: "peek"
     - Side-effekter: Setter #state til: "playersTurn"
     * @returns true
     */
    peek() {
        if (this.#state !== "peek") return false;
        // sjekk om dealerens første kort er 'A'

        // hvis ^ === true ... sett state til "insurance" (eller noe slik)

        // ellers kan vi kjøre dette som før...
        this.#state = "playersTurn"; // dette vil endres når metoden implementeres.
        return true;
    }
    /** Midlertidig løsning. */
    playerDone() {
        if (game.#state !== "playersTurn") return false;
        game.#state = "dealersTurn";

        return this.dealer.dealerTurn();
    }
    /**
     * Sjekker alle hånd for potensjelle gevinst, og returnerer all-data fra denne runden.
     * @returns {object} - ett objekt som inneholder:
     * - { {dealer: cards: kort, value: besteVerdi}, players: [...{playerdata}] }
     * - playerdata inneholder: 
     * - {baseBet: bet, totalBet: totalBet, totalWin: totalWin, hands: [...{hands}]}
     * - hver hands er en objekt som innteholder kort[], besteverdi, baseBet og gevinst
     */
    determineWinner() {
        if (game.state !== "dealersTurn") return false;
        /**
         * initialiser result objektet 
         * her lagrer vi dealerens kort og dens beste-verdi. Og for hver spiller lagrer vi basebet, totalbet, totalwin, i tillegg lagrer vi
         * hver av spillerens hånd inni result.hands[]array med data: baseBet, win, cards og bestValue.
         */
        let result = {
            dealer: {
                cards: this.dealer.hand.cards,
                value: this.dealer.hand.bestValue
            },
            players: []
        };
        
        for (let i = 0; i < this.players.length; i++) { // loop gjennom spillerne
            result.players.push({ // legg til denne spilleren som ett objekt i result.players[] array
                baseBet: this.players[i].baseBet,
                totalBet: 0,
                totalWin: 0,
                hands: []
            }); 
            for (let hand of this.players[i].hands) { // loop gjennom alle hånd for denne spilleren
                let handWin = 0;
                // hvis denne hånden er enten (mindre enn 22 og den er er høyere enn dealerens hånd) eller hvis dealerens hånd er over 21 mens spillerens hånd er under 22.
                if (hand.bestValue <= 21 && ((hand.bestValue > this.dealer.hand.bestValue) || this.dealer.hand.bestValue > 21)) {
                    // en blackjack hånd inneholder bare 2 kort som har sum av 21 (en: A + en: 10/J/Q eller K)
                    if (hand.cards.length === 2 && hand.bestValue === 21) {
                        // hvis #rules.blackjack.suited er truthy, og dette er en 'suited blackjack', set gevinst til #rules.blackjack.suited * bet
                        if (this.#rules.blackjack.suited && (hand.cards[0].suit === hand.cards[1].suit)) handWin = hand.baseBet * this.#rules.blackjack.suited;
                        // ellers er gevinst som #rules.blackjack.standard (default 2.5x bet)
                        else handWin = hand.baseBet * this.#rules.blackjack.standard;
                    }
                    /*
                       Må legge til x-card charlie og 777 gevinst kombinasjonene her!
                    */

                    // ellers er det en vanlig gevinst, som utbetaler 2x bet
                    else handWin = hand.baseBet * 2;
                }
                // det er en 'push', spillerens hånd-verdi var identisk med dealerens. Gevinst er 1x bet.
                else if (hand.bestValue === this.dealer.hand.bestValue) {
                    handWin = hand.baseBet;
                    console.log("Hand is a push!");
                }
                // i alle andre tilfeller vant dealeren.
                else {
                    console.log("Dealers hand beat the players hand!");
                }

                // legg hand-data inni result objektet
                result.players[i].hands.push({
                    baseBet: hand.baseBet,
                    win: handWin,
                    value: hand.bestValue,
                    cards: hand.cards
                });
                result.players[i].totalBet += hand.baseBet; // oppdater totalBet
                result.players[i].totalWin += handWin; // oppdater totalWin
            }
            this.players[i].balance += result.players[i].totalWin; // juster balansen
            this.players[i].hands = []; // tøm alle hands for denne spilleren
        }
        this.deck.discard(); // flytter alle kortene fra spillere+dealeren til deck.#discard array
        // sist, fjern dealerens kort, sett state til "init", og returner result
        this.dealer.hand = new Hand();
        this.#state = "init";
        return result;
    }
}
/** Player class - Blackjack spilleren. Instansierer Hand(), kontrollerer alle håndene til spilleren */
class Player {
    balance = 200;
    lastBaseBet = 0;
    baseBet = 5;
    hands = [];

    constructor() {
    }
    /** Setter baseBet
     * - Forutsetninger: a) #state: "init"
     * @param {*} bet - Enten ett tall, "clear" eller "rebet". Hvis tallet overstiger rules.maxbet eller balance vil den justere seg-selv til 0 og sette baseBet til 0+bet
     * @returns {number} baseBet
     */
    setBet(bet) {
        if (game.state !== "init" || bet < 0) return false;
        if (bet === "clear") this.baseBet = 0;
        else if (bet === "rebet") this.baseBet = this.lastBaseBet;
        else {
            bet = parseInt(bet);
            if ( (this.balance >= (this.baseBet + bet)) && (this.baseBet + bet <= game.rules.maxbet) ) this.baseBet += bet;
            else if (bet <= game.rules.maxbet && bet >= game.rules.minbet) this.baseBet = bet;
            else this.baseBet = game.rules.minbet;
        }
        return this.baseBet;
    }
    /**
     * Trekker baseBet fra balance, setter lastbet til baseBet, kjører game.playerReady() som bl.a. setter #state til "deal". 
     * 
     * - Forutsetninger: a) #state: "init" b) #bet satt til en verdi >= balance og innenfor rules.minbet:rules.maxbet
     * @returns {Object} {balance: players-balance, cardsleft}
     */
    deal() { 
        if (game.state !== "init") return false;
        if (this.baseBet < game.rules.minbet || this.baseBet > game.rules.maxbet || this.baseBet > this.balance) return false;
        this.balance -= this.baseBet;
        this.lastBaseBet = this.baseBet;
        this.hands.push(new Hand(-1, this.baseBet)); 
        return game.playerReady();
    }
    /** @returns (Neste) valgbar hånd nummer eller -1 hvis ingen valgfrie hånd eksisterer. */
    get selectHand() { 
        let handNum = this.hands.length - 1;
        while (handNum >= 0) {
            if (this.hands[handNum].open) break;
            handNum--;
        }
        return handNum;
    }
    /**
     * Stand (stenger) dette håndet. 
     * - Forutsetninger: a) #state: "playersTurn"
     * @returns Dette håndets nummer og nexthand nummer. Hvis nexthand returnerer -1 betyr det at det er ingen flere valgbare hånd.
     */
    stand() {
        if (game.state !== "playersTurn") return false;
        const handNum = this.selectHand;
        if (!this.canStand(handNum)) return false;
        this.hands[handNum].open = false; // close this hand.
        return {closeHand: handNum, nextHand: this.selectHand}; 
    }
    /**
     * Dev-tool, skal fjernes. Det burde ikke være mulig å operere en hånd som er busted/closed.
     * @param {number} handNum 
     * @returns bool
     */
    canStand(handNum = 0) { // sjekk om hånden ...
        if (handNum < 0) return false; // ikke eksisterer 
        if (this.hands[handNum].bestValue > 21) return false; // er allerede busted
        return true; 
    }
    /**
     * Player Hit. Trekker ett kort til selectHand. 
     * - dersom det nye kortet øker hand.bestValue > 21 vil open returnere closed, og da er dette håndet stengt for flere handlinger.
     * 
     * - Forutsetninger: a) #state: "playersTurn" b) canHit() vilkår.
     * @returns {Object} {handNum: dennehånd, splitFrom: håndnummer|-1 card: nye-kortet, value: {soft: verdi, hard: verdi}, open: open/closed}
     */
    hit() { 
        if (game.state !== "playersTurn") return false;
        const handNum = this.selectHand;
        if (!this.canHit(handNum)) return false;
        return {
            handNum: handNum,
            splitFrom: this.hands[handNum].splitFrom,
            card: this.hands[handNum].addCard(game.deck.next()).card(), // trekk ett tilfeldig kort, vis les-bar verdi f.eks: "10c"
            value: this.hands[handNum].value,
            open: this.hands[handNum].open
        }
    }
    /**
     * Sjekk om hånd kan hitte
     * @param {*} handNum 
     * @returns true | false
     */
    canHit(handNum = 0) { // sjekk om hånden ...
        if (handNum < 0) return false; // ikke eksisterer 
        if (this.hands[handNum].bestValue > 21 || this.hands[handNum].cards.length === game.rules.maxCardsPerHand) return false; // verdien av hånden overstiger 21 eller den har flere kort enn det rules.maxCardsPerHand tillater
        if (!game.rules.split.hitSplitAces && handNum > 0 && this.hands[handNum].cards[0].value == "A") return false; // er ett split-hand, kortet er en 'A' mens rules.split.hitSplitAces tillater ikke å hitte split-aces
        return true; 
    }
    /**
     * Doubler bet, og trekker ett kort til selectHand. 
     * - Forutsetninger: a) #state: "playersTurn" b) canDouble() vilkår.
     * @returns {Object} {handNum: dennehånd, splitFrom: håndnummer|-1, card: nye-kortet, bet: baseBet (doblet) value: {soft: verdi, hard: verdi}, balance: this.balance}
     */
    double() {
        if (game.state !== "playersTurn") return false;
        const handNum = this.selectHand;
        if (!this.canDouble(handNum)) return false;
        this.balance -= this.baseBet;// << this doesnt work for multiple hands!!!
        this.hands[handNum].baseBet *= 2;
        this.hands[handNum].open = false;
        return {
            handNum: handNum,
            splitFrom: this.hands[handNum].splitFrom,
            card: this.hands[handNum].addCard(game.deck.next()).card(),
            value: this.hands[handNum].value,
            bet: this.hands[handNum].baseBet,
            balance: this.balance
        } 
    }
    /**
     * Sjekk om hånd kan doble.
     * @param {*} handNum 
     * @returns true | false
     */
    canDouble(handNum = 0) { // sjekk om hånden ...
        if (handNum < 0) return false; // ikke eksisterer 
        if (!game.rules.double.allow || this.hands[handNum].cards.length > 2) return false; // rules tillater ikke dobling eller denne hånden har mer enn 2 kort
        if (handNum > 0 && !game.rules.double.aftersplit) return false; // er splittet hånd og reglene tillater ikke dobling etter splitting
        if (this.balance < this.hands[handNum].baseBet) return false; // har ikke nok balance 
        if (!game.rules.double.soft && (this.hands[handNum].value.hard < game.rules.double.range[0] || this.hands[handNum].value.hard > game.rules.double.range[1])) return false; // hard-verdien av hånden er utenfor rules.range mens soft-dobling er ikke tillatt 
        if (game.rules.double.soft && (this.hands[handNum].value.soft < game.rules.double.range[0] || this.hands[handNum].value.soft > game.rules.double.range[1])) return false; // med soft-dobling tillatt, er denne hånden utenfor rules.range ?
        return true;  
    }
    /**
     * Instansierer en ny hånd, flytter det siste kortet fra denne hånd til det nye. Og så trekker den ett nytt kort til den nye hånden og ett nytt kort til denne hånden. Relasjonen mellom disse 2 håndene er lagret i 'splitFrom' variablen i den nye hånden.
     * - Forutsetninger: a) #state: "playersTurn" b) #canSplit() vilkår.
     * @returns {array} En array med 4 elementer, f.eks: 
     * [
     * -     0: {"value":{"soft":9,"hard":9},"card":"9h","baseBet":6}, // splitFrom med det siste kort fjernet
     * -     1: {"value":{"soft":10,"hard":10},"card":"Kh","baseBet":6}, // splitTo med det siste kort fra splitFrom
     * -     2: {"value":{"soft":14,"hard":14},"cards":"4s","baseBet":6}, // splitTos nylig trukket kort
     * -     3: {"value":{"soft":19,"hard":19},"cards":"Kd","baseBet":6} // splitFroms nylig trukket kort
     * - ]; // splitFroms, splitTos rekkefølge er byttet for å tilfredstille BJ regler, siste hånd skal spilles først.
     */
    split() { // need to fix this one
        if (game.state !== "playersTurn") return false;
        const handNum = this.selectHand;
        if (!this.canSplit(handNum)) return false; // sjekk om vi passerer alle canSplit forutsetninger
        this.balance -= this.baseBet; // juster balance

        // instansier en ny hånd, konstruer med paremetere: det siste kortet fra hånden: 'handNum', splitFrom satt til 'handNum' og baseBet satt till baseBet
        this.hands.push(new Hand(handNum, this.baseBet, this.hands[handNum].removeLastCard())); // push dette ^ som ett nytt element i this.hands

        return [ 
            { // splitFrom:
                value: Object.assign({}, this.hands[handNum].value), // hånd-verdi, bruker Obj.assign fordi vi trenger verdien istedet for referansen.
                card: this.hands[handNum].cards[0].card(), // gjenstående kortet i splitFrom hånden
                baseBet: this.hands[handNum].baseBet // baseBet
            },
            { // splitTo:
                value: Object.assign({}, this.hands[this.hands.length-1].value),  // hånd-verdi, bruker Obj.assign fordi vi trenger verdien istedet for referansen.
                card: this.hands[this.hands.length-1].cards[0].card(), // det siste kortet fra splitFrom hånden
                baseBet: this.hands[this.hands.length-1].baseBet
            }, // etter split, trekk ett kort til hver hånd... vi bruker motstatt rekkefølge fordi spilleren skal først spille splitTo-hånden
            { // splitTo 
                value: this.hands[this.hands.length-1].value, // hånd-verdi inkluderer det nye kortet
                card: this.hands[this.hands.length-1].addCard(game.deck.next()).card(), // ett nytt tilfeldig kort
                baseBet: this.hands[this.hands.length-1].baseBet
            },
            { // splitFrom
                value: this.hands[handNum].value, // hånd-verdi inkluderer det nye kortet
                card: this.hands[handNum].addCard(game.deck.next()).card(), // ett nytt tilfeldig kort
                baseBet: this.hands[handNum].baseBet
            }
        ];
    }
    /**
     * Sjekk om hånden kan splittes.
     * @param {*} handNum 
     * @returns true | false
     */
    canSplit(handNum = 0) { // sjekk om hånden ...
        if (handNum < 0) return false; // ikke eksisterer 
        if (this.hands[handNum].cards.length > 2) return false; // har mer enn 2 kort
        if (this.hands.length > game.rules.split.allow) return false; // har splittet flere ganger enn rules.split.allow
        if (this.hands[handNum].cards[0].rank !== this.hands[handNum].cards[1].rank) return false; // kortene er ikke samme rank
        if (this.balance < this.hands[handNum].baseBet) return false; // har ikke nok balance 
        if (!game.rules.split.resplitAces && (this.hands[handNum] > 0 && this.hands[handNum].cards[0].rank === "A")) return false; // dette er en 'A', og dette er en resplit hånd, game.rules.split.resplitAces sier dette er ikke tillatt
        if (game.rules.split.except === this.hands[handNum].cards[0].rank) return false; // er i unntaks-listen for splittbare kort (rules.split.except)
        return true; 
    }
}
/** Player class - AI Blackjack spillere.  */
class AIplayer extends Player {
    /* WIP */
}
/** Dealer class - dealer spilleren. Instansierer Hand() */
class Dealer {
    hand;
    constructor() {
        this.hand = new Hand();
    }
    /**
     * 
     * @returns objekt med: 'dealerHits' (en array med alle dealrens kort og hånd-verdi for hvert kort) og 'wins' som inneholder objekter med output fra: determineWinner()
     */
    dealerTurn() {
        if (game.state !== "dealersTurn") return false;
        // oppdater hånd-verdien
        this.hand.updateValue();
        // initialiser result med hånd-verdier før 'hit-or-stand' loopen
        let result = [{card: this.hand.cards[1].card(), value: Object.assign({}, this.hand.value)}];
        // dealer skal bare hitte mens hand.value er mindre enn det reglene sier...
        while ((
                (this.hand.value.soft <= 17 && game.rules.hitSoft17 && this.hand.value.soft < this.hand.value.hard) || this.hand.value.hard < 17) 
                && this.hand.cards.length < game.rules.maxCardsPerHand) {
                    result.push({card: this.hand.addCard(game.deck.next()).card(), value: Object.assign({},this.hand.value)})
        }
        return {dealerHits: result, wins: game.determineWinner()};  
    }
}
/** Hand class - kontrollerer alle hånd. */
class Hand {
    #splitFrom = -1; // hånd-nummer denne hånden splitter fra, default: -1 
    #cards = []; // array med Card() -instances
    #value = {soft: 0, hard: 0}; // hånd-verdien (soft&hard)
    baseBet = 0; // bet for denne hånd (inkl. doubles, men ekskl. splits)
    open = true; // hvis true kan spilleren foreta actions på denne hånden (f.eks. hit,split,double).
    /** 
     * @param {number} splitFrom - hånd-nummer denne hånden splitter fra, default: -1 
     * @param {number} baseBet - bet for denne hånd (inkl. doubles, men ekskl. splits)
     * @param {number} card - hvis splitFrom er satt til >= 0 må kort-instance legges inn her.
    */
    constructor(splitFrom = -1, baseBet = 0, card = undefined) {
        this.baseBet = baseBet;
        this.#splitFrom = splitFrom;
        if (this.#splitFrom >= 0) {
            this.addCard(card);
        }
    }
    /** @returns {number} this.#value.hard | this.#value.soft - høyest hånd-verdi som ikke overstiger 21  */ 
    get bestValue() {
        if (this.#value.hard <= 21) return this.#value.hard;
        return this.#value.soft;
    }
    /** @returns {object} this.#value - hånd-verdien (soft&hard) */ 
    get value() {
        return this.#value;
    }
    /** @returns this.#cards - alle kort i denne hånden. */ 
    get cards() {
        return this.#cards;
    }
    /** @returns this.#splitFrom - hånd-nummer denne hånden splittet fra. */ 
    get splitFrom() {
        return this.#splitFrom;
    }
    /** Oppdaterer this.#value */ 
    updateValue() {
        let hasSoftAce = false; // settes til true hvis en 'A' kan telles som 11
        let handValue = 0; // midlertidig lagring av hånd verdi
        for (let { value } of this.#cards) { // loop gjennom hver kort
            if (value === 11) { // er kortet er en 'A'
                if (handValue + 11 <= 21) { // kan den telles som 11 ?
                    handValue += 11;
                    hasSoftAce = true;
                }
                else handValue += 1; // hvis ikke tell den som 1
            }
            else handValue += value; // hvis det ikke er en 'A'
        }
        this.#value.hard = this.#value.soft = handValue; // sett hard&soft value til handValue;
        if (hasSoftAce) this.#value.soft -= 10; // hvis ace kunne telles som 11 trekk 10 fra soft
        if (this.#value.soft > 21) this.open = false; // hvis kortet er 'busted' sett open til false
    }
    /** Legger ett kort til i hånden.
     * @param {object} card - Ett kort instance
     * @param {*} updateValue true | false - default: true - oppdater hand.value ?
     * @returns {object} card - Returnerer kortet
     */
    addCard(card, updateValue = true) {    	
        this.#cards.push(card);
        if (updateValue) this.updateValue();
        return card; // returnerer kort-objektet
    }
    /** Fjerner det siste kortet fra hånden, og muterer #value
     * @returns {object} Kortet som ble fjernet
     */
    removeLastCard() {
        const result = this.cards.pop();
        this.updateValue();
        return result;
    }
}
/** Deck class - kontrollerer alle kortstokker, instansierer alle Card(), trekker tilfeldige kort og refiller 'shoe' etter behov */
class Deck {
    #decks = 1; // antall kortstokker, default: 1
    // shoe,inPlay og discard arrays lagrer instances av Card()
    #shoe = []; // lagrer x antall kortstokker
    #inPlay = []; // lagrer kort som er trukket ut fra shoe til spillere
    #discard = []; // lagrer kort som er allerede brukt i spillet
    
    /** @param {number} decks - antall kortstokker, default: 1 */
    constructor(decks = 1) {
        this.#decks = decks;
        for (let i = 52 * this.#decks; i > 0; i--) { // kort måte å generere x-antall kortstokker
            this.#shoe.push(new Card(i%52)); // push en instance av ett kort inni shoe
        }
    }
    /** Trekker ett tilfeldig kort ut av shoe-array. Dersom shoe er tom vil den først refille fra discard-array.
     * @returns {Object} Instance av ett tilfeldig kort.
     */
    next() {
        // hvis shoe er tom, refill den.
        if (this.#shoe.length < 1) this.#shoe.push(...this.#discard.splice(0,this.#discard.length));
        // trekk ett tilfeldig kort.
        const nextCard = this.#shoe.splice(Math.floor(Math.random() * this.#shoe.length),1)[0];
        this.#inPlay.push(nextCard); // push kortet inni inPlay array
        return nextCard;
    }
    /** Flytter alle kortene fra inPlay til discard */
    discard() {
        this.#discard.push(...this.#inPlay.splice(0,this.#inPlay.length)); // ...(spread) gjør cards omtil separate-elementer før .push
    }
    get status() {
        return {decks: this.#decks, shoe: this.#shoe.length, discard: this.#discard.length};
    }
}
/** Card class - holder hvert kort som en instance */
class Card {
    #card = 0; // kort-index: 0-51
    static #SUITS = "scdh"; // suits: s = spades, c = clubs, d = diamonds, h = hearts 
    static #FACES = "JQKA"; // faces: J = Jack, Q = Queen, K = King, A = Ace
    static #BACKSIDE = "back"; // navn på baksiden

    /** @param {number} card kort-index (0-51) */
    constructor(card = 0) {
        this.#card = card;
    }
    /** @returns {string} blackjack kort verdi (2-10 = 2-10, 10,J,Q,K = 10, A = 11) */ 
    get value() {
        return this.rank > 0 ? parseInt(this.rank) : this.rank == "A" ? 11 : 10;
    }
    /**
     * @param {boolean} front Default: true - Vanligvis returnerer den front-siden, hvis den er satt til false returnerer den #backside
     * @returns {string} kort-verdi (f.eks: 'Kh') | 'backside'
     */
    card(front = true) {
        if (front) return this.rank + this.suit;
        return Card.#BACKSIDE;
    }
    /** @returns {string} rank kort-suit (f.eks: 'h') */ 
    get suit() {
        return Card.#SUITS[this.#card%4];
    }
    /** @returns {string} rank kort-rank (f.eks: 'K') */ 
    get rank() {
    	let rank = this.#card%13 + 2;
        if (rank > 10) rank = Card.#FACES[rank%11];
        return rank;
    }
}
/**
 * Blackjack rules object.
 * Denne skal flyttes til en annen fil, midlertidig plassert her.
 * Noen av reglene er ikke implementert enda.
 */
const blackjackrules = {
    classic: {
        decks: 1, // antall kortstokker
        maxCardsPerHand: 5, // max antall kort per hånd.
        hitSoft17: true, // skal dealeren hitte soft-17 ? 
        double: {
            allow: true, // tillat spilleren å 'doble' ?
            range: [0,21], // bare tillat dobling hvis kort verdien er mellom: [fra,til] (default: 0,21 = ingen begrensning)
            soft: true, // tillat dobling hvis spillerens hånd har en soft verdi ?
            aftersplit: true // tillat dobling etter splitting ?
        },
        split: {
            allow: 4, // hvor mange ganger kan spilleren splitte ? en verdi av 4 betyr de kan ha opptil 5 hånd per runde.
            resplitAces: true, // tillat splitting av 'A'
            hitSplitAces: true, // tillat hitting av 'A' etter split ?
            except: false // Unntaksliste, legg til kort som ikke skal være splitbare. Mulige verdier: 2,3,4,5,6,7,8,9,10,"J","Q","K","A"
        },
        blackjack: {
            standard: 2.5, // Blackjack gevinst: x bet (default: 2.5)
            suited: false // Har en suited blackjack en spesiell gevinst ? Hvis ikke la den være false, ellers skriv en verdi (dette er også x bet).
        },
        peeks: false, // (ikke implementert) hvis dealers første kort er en 'A' skal de tilby forsikring ?
        surrender: false, // (ikke implementert) forventede verdier: false, "early", "late", "full"
        specialpays: { // (ikke implementert) 
            charlie: { // (ikke implementert) 
                numCards: false, // antall kort som trengs for "X card Charlie" vinne kombinasjon, la den være false for å skruv av.
                pays: 1.5 // utbetaling.
            }, // (ikke implementert) 
            threeSevens: false // har 777 en spesiell gevinst ? hvis ja skriv oppgi det (den er også x bet)
        }
    }
}