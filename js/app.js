'use strict';
let game; // lagrer Game() instance
let playerSeat = 0; // i denne versjon har vi bare ett spiller-sete, og det er 0
/* hoved-meny elementer */
const mainMenu  = document.getElementById("main-menu");
const btnNewGame  = document.getElementById("btn-new-game");
const navMenu  = document.getElementById("nav-menu");
const btnMenu  = document.getElementById("btn-menu");
/* hoved-meny events */
btnNewGame.addEventListener("click", function() { // starter newGame()
    toggleVisibility(mainMenu);
    toggleVisibility(navMenu,1);
    newGame();
})
btnMenu.addEventListener("click", function() { // viser hoved-meny
    toggleVisibility(mainMenu,1);
    toggleVisibility(navMenu);
    removeAllChildren(handButtons);
});
/* spill-relaterte elementer */
const betButtons = document.getElementById("bet-buttons");
const handButtons = document.getElementById("hand-buttons");
const playerHand = document.querySelector(".player-hand");
const playerBalance = document.getElementById("player-balance");
const playerBet = document.getElementById("player-bet");
const dealerHand = document.getElementById("dealer-hand");
const rulesContainer = document.getElementById("rules");
const cardsLeftEl = document.getElementById("cards-left");
const cardsUsedEl = document.getElementById("cards-used");
const cardsLeftCardEl = document.querySelector(".cards-shoe");
const cardsUsedElCardEl = document.querySelector(".cards-used");

/*  DOM-utility-funsjoner   */
function toggleVisibility(prop, hide = false) { // vis/skjul prop
    hide 
        ? prop.classList.remove("hide")
        : prop.classList.add("hide")
}
function createElement(className, id, elementType = 'div', content, children = undefined) { // lag ett element

    let newElement = document.createElement(elementType);
    if (id) newElement.id = id;
    if (className) newElement.className = className;

    if (children) {
        newElement.appendChild(children)
    }
    else newElement.textContent = content;

    return newElement
}
function createPlayerHand(handNum) { // lag tom spiller hånd
    playerHand.appendChild(createElement("cards", "player-hand" + handNum))
    const playerHandCurrent = document.getElementById("player-hand" + handNum)
    playerHandCurrent.appendChild(createElement("hand-score", "player-hand" + handNum + "-score", "span",""))
    playerHandCurrent.appendChild(createElement("hand-won hand-bet", "player-hand" + handNum + "-win", "p",""))
}
function createDealerHand() { // lag tom dealer hånd
    dealerHand.appendChild(createElement("hand-score", "dealer-hand-score", "span",""))
}
function activeHand(prop, hide = false) { // setter/fjerner outline rundt prop
    hide 
        ? document.getElementById(prop).classList.remove("player-hand-active")
        : document.getElementById(prop).classList.add("player-hand-active")
}
async function createDecks() {
    removeAllChildren(cardsLeftCardEl);
    removeAllChildren(cardsUsedElCardEl);
    for (let i = 0; i < 5; i++) {
        cardsLeftCardEl.appendChild(document.createElement('div'));
        cardsUsedElCardEl.appendChild(document.createElement('div'));
        await sleep(50);     
    }
    cardsLeftEl.textContent = game.deck.status.shoe;
    cardsUsedEl.textContent = game.deck.status.discard;
}
async function dealCard(element,card, double = "") { // deler ut kort
    document.getElementById(element).appendChild(createElement("card card-" + card + double));
    // vis antall kort som gjenstår
    cardsLeftEl.textContent = game.deck.status.shoe;
    cardsUsedEl.textContent = game.deck.status.discard;
    
    // WIP: legg til/fjern divs i cards-used, cards-shoe
    /* 
    const totalCards = game.deck.status.shoe + game.deck.status.discard;
    const shoeDivCount = Math.round(game.deck.status.shoe*1 / totalCards);
    const usedDivCount = Math.round(game.deck.status.discard*1 / totalCards);
    let createEl = document.createElement('div');
    if (!usedDivCount) {
        removeAllChildren(cardsUsedElCardEl);
    }
    else {
        cardsUsedElCardEl.appendChild(createEl);
    }
    if (shoeDivCount) {
        removeAllChildren(cardsLeftCardEl);
    }
    else {
        cardsLeftCardEl.appendChild(createEl);
    }
    console.log("disc: " + Math.round(game.deck.status.discard*5 / totalCards) );
    console.log("shoe: " + Math.round(game.deck.status.shoe*5 / totalCards) ); */
}
function revealHiddenCard(hiddenCard) { // viser dealerens skjulte kort.
    document.querySelector("#dealer-hand > div.card-back").remove();
    dealCard("dealer-hand",hiddenCard.card);
    displayHandValue("dealer-hand-score",hiddenCard.value);
}
function displayHandValue(hand,handValue) { // viser handValue i elementet 'hand'
    let valueText = handValue.soft;
    if (handValue.hard <= 21 && handValue.hard > handValue.soft) valueText += "/" + handValue.hard
    document.getElementById(hand).textContent = valueText
}
function removeAllChildren(parent) { // fjerner alle child-elements fra parent
    while (parent.lastChild) {
        parent.removeChild(parent.lastChild);
    }
}
function createHandButtons(handNum) { // lager knapper hvis tillatt
    if (game.players[playerSeat].canHit(handNum)) handButtons.appendChild(createElement("btn", "btn-hit", "button", "hit"));
    if (game.players[playerSeat].canStand(handNum)) handButtons.appendChild(createElement("btn", "btn-stand", "button", "stand"));
    if (game.players[playerSeat].canDouble(handNum)) handButtons.appendChild(createElement("btn", "btn-double", "button", "double"));
    if (game.players[playerSeat].canSplit(handNum)) handButtons.appendChild(createElement("btn", "btn-split", "button", "split"));
}

/*  Spill funsjoner og events (bare front-end, logikk og data ligger i game.js)  */
function newGame() { // til: newRound()
    // instansier Game() og start spillet
    game = new Game();
    createDecks();
    newRound();
}
function newRound() { // til: takeBets(event)
    // fjern alle hånd
    removeAllChildren(dealerHand);
    removeAllChildren(playerHand);
    // vis spillerens balance og bet
    playerBalance.textContent = game.players[playerSeat].balance;
    playerBet.textContent =  game.players[playerSeat].baseBet;
    // vis bet-buttons
    betButtons.addEventListener("click", takeBets);
    toggleVisibility(betButtons,1);
}
function takeBets(event) { // til: deal()
    const clickTarget = event.target.id;
    // lagre slice av clickTarget-knapper i betButton for å fange opp spesifike clicks.
    const betButton = clickTarget.slice(clickTarget.lastIndexOf("-") + 1)
    if (betButton === "deal") {
        // oppdater balansen og kjør deal()
        if (game.players[playerSeat].deal()) {
            toggleVisibility(betButtons);
            playerBalance.textContent = game.players[playerSeat].balance;
            deal();
        }
    }
    else if (betButton !== "buttons") {
        // dette skal bare fange opp: "clear", "rebet" eller tall som da parmetiserer setBet-metoden...
        // utfør setBet, og oppdater bet elementet
        playerBet.textContent =  game.players[playerSeat].setBet(betButton);
    }
}
async function deal() { // til: awaitHandAction()
    // lag hånd elementer
    createPlayerHand(1);
    createDealerHand();
    // hent draw() data
    const drawResult = game.draw();
    // oppdater bet
    document.getElementById(`player-hand1-win`).textContent = "Bet: $" + game.players[playerSeat].hands[0].baseBet;
    // loop gjennom drawResult, viser hver spillers første 2 kort, dealers første kort og baksiden av dealers andre kort. Og oppdater hånd-verdier.
    for (let i = 1; i < 3; i++) {
        for (const card of drawResult["playersCard"+i]) {
            await sleep(500);
            dealCard("player-hand1",card.card);
            displayHandValue("player-hand1-score",card.value);
        }
        await sleep(500);
        dealCard("dealer-hand",drawResult["dealerCard"+i].card);
        displayHandValue("dealer-hand-score",drawResult["dealerCard"+i].value);
    }
    // peek funksjonaliteten er ikke implementert, så vi bare kjører den i bakgrunnen her
    console.log("Peek: " + game.peek());
    // vis outline rundt spillerens hånd
    activeHand("player-hand1");
    // lag hånd knapper og aktiver click-event gjennom awaitHandAction()
    createHandButtons(0);  
    handButtons.addEventListener("click", awaitHandAction);
}
function awaitHandAction(event) { // til: flere...
    const clickTarget = event.target.id
    // funksjons-objekt for alle hånd knapper
    const buttonsClickable = {
        "btn-stand": function() {
            removeAllChildren(handButtons); // fjern hånd-knappene
            const standResponse = game.players[playerSeat].stand(); 
            activeHand(`player-hand${standResponse.closeHand+1}`,1); // fjern outline rundt hånden
            // sjekk om det er flere hånd som kan spilles
            if (standResponse.nextHand < 0) {
                console.log("no more hands, dealers turn");
                dealersTurn(game.playerDone());
            }
            else {
                // lag outline rundt neste hånden og vis knapper
                activeHand(`player-hand${standResponse.nextHand+1}`);
                createHandButtons(standResponse.nextHand);
            }
        },
        "btn-hit": function() {
            const hitresult = game.players[playerSeat].hit();
            if (!hitresult.open) removeAllChildren(handButtons); // hvis hånden er > 21 fjern knappene
            playerHit(hitresult); // vis hit resulatet
            if (!hitresult.open) { // hvis hånden er > 21
                if (hitresult.splitFrom !== -1) {
                    // flytt outline til neste hånd
                    activeHand(`player-hand${hitresult.handNum+1}`, 1);
                    activeHand(`player-hand${hitresult.splitFrom+1}`);
                    createHandButtons(hitresult.splitFrom);
                }
                else {
                    console.log("no more hands, dealers turn");
                    removeAllChildren(handButtons);
                    dealersTurn(game.playerDone());
                }
            }
            else { // ellers, fjern alle knapper unntatt hit, stand
                removeAllChildren(handButtons);
                createHandButtons(hitresult.handNum);
            }
        },
        "btn-double": function() {
            const doubleResult = game.players[playerSeat].double();
            // vis 'double'-resultatet, deretter enten gå til neste hånd eller kjør dealersTurn
            removeAllChildren(handButtons);
            playerDouble(doubleResult);
            if (doubleResult.splitFrom !== -1) { 
                createHandButtons(doubleResult.splitFrom);
            }
            else {
                console.log("no more hands, dealers turn");
                removeAllChildren(handButtons);
                dealersTurn(game.playerDone());
            }
        },
        "btn-split": function() {
            const splitResult = game.players[playerSeat].split();
            // fjern knappene og vis split-resultat
            removeAllChildren(handButtons);
            playerSplit(splitResult);
        }
    }
    // utfør click-funksjon
    buttonsClickable[clickTarget]();
}
async function playerHit(response) {
    if (!response) return;
    // del ut kortet og oppdater score
    await sleep(500);
    dealCard(`player-hand${response.handNum+1}`,response.card);
    displayHandValue(`player-hand${response.handNum+1}-score`,response.value);
}
async function playerDouble(response) {
    if (!response) return;
    // vis oppdatert bet, og oppdater spiller-balansen
    document.getElementById(`player-hand${response.handNum+1}-win`).textContent = "Bet: $" + response.bet;
    playerBalance.textContent = game.players[playerSeat].balance;
    // del ut kortet, oppdater score
    await sleep(500);
    dealCard(`player-hand${response.handNum+1}`,response.card, " card-double");
    displayHandValue(`player-hand${response.handNum+1}-score`,response.value);
    activeHand(`player-hand${response.handNum+1}`,1);
    // flytt outline hvis det trengs
    if (response.splitFrom !== -1) activeHand(`player-hand${response.splitFrom+1}`);
}
async function playerSplit(handData) {
    // oppdater spillerens balance
    playerBalance.textContent = game.players[playerSeat].balance;
    // lagre de 2 hånd-nummer:
    const splitTo = game.players[0].hands.length-1;
    const splitFrom = game.players[0].hands[splitTo].splitFrom;
    // fjern det siste kortet fra hånd splitFrom
    const handElement = document.querySelector(`#player-hand${splitFrom+1}`)
    handElement.removeChild(handElement.lastChild); 
    // oppdater hånd-verdien
    displayHandValue(`player-hand${splitFrom+1}-score`,handData[0].value)
    // fjern outline rundt hånd splitFrom
    activeHand(`player-hand${splitFrom+1}`,1);
    // lag en ny hånd, og sett undertekst
    await sleep(500);
    createPlayerHand(splitTo+1);
    document.getElementById(`player-hand${splitTo+1}-win`).textContent = "Bet: $" + handData[1].baseBet;
    // vis kort & hånd-verdi i splitTo-hånden
    for (let i = 1; i < 3; i++) {
        await sleep(500); 
        dealCard(`player-hand${splitTo+1}`,handData[i].card);
        displayHandValue(`player-hand${splitTo+1}-score`,handData[i].value);
    }
    // vis ett nytt kort i splitFrom
    await sleep(500);
    dealCard(`player-hand${splitFrom+1}`,handData[3].card)
    displayHandValue(`player-hand${splitFrom+1}-score`,handData[3].value)
    // lag knapper og sett outline rundt splitTo hånden
    activeHand(`player-hand${splitTo+1}`);
    createHandButtons(splitTo);
    return; 
}
async function dealersTurn(dealerHand) {
        // vis det skjulte kortet
        await sleep(1500);
        revealHiddenCard(dealerHand.dealerHits[0]);
        // vis dealer hits kortene
        for (let i = 1; i < dealerHand.dealerHits.length; i++) {
            await sleep(500);
            dealCard("dealer-hand",dealerHand.dealerHits[i].card)
            displayHandValue("dealer-hand-score",dealerHand.dealerHits[i].value)
        }
        // vis spillresultat for hver hånd
        for (let i = 0; i < dealerHand.wins.players.length; i++) {
            const playerData = dealerHand.wins.players[i];
            for (let j = 0; j < dealerHand.wins.players[i].hands.length; j++) {
                const handData = playerData.hands[j]; //dealerHand.wins.players[i].hands[j];
                const winElement = document.getElementById(`player-hand${j+1}-win`);
    
                if (handData.win > 0) {
                    winElement.classList.remove("hand-bet");
                    winElement.textContent = "You won $" + handData.win;
                }
            }
            // her skal vi vise totale verdier, midlertidig bare logget til console...
            console.log("Basebet: " + playerData.baseBet);
            console.log("totalBet: " + playerData.totalBet);
            console.log("totalWin: " + playerData.totalWin);
        }
        playerBalance.textContent = game.players[playerSeat].balance;
        // start ny runde
        await sleep(2500);
        newRound();
    
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}