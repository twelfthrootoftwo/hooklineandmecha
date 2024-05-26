import {Utils} from "../utilities/utils.js";
import {ACTOR_TYPES, ATTRIBUTES, RESOURCES, HIT_TYPE} from "../constants.js";

export class AttackHandler {
	static async rollToHit(
		attacker,
		attackKey,
		defender,
		defenceKey,
		dieCount,
		flatModifier
	) {
		const attackRoll = Utils.getRoller(
			dieCount,
			flatModifier
		);
		await attackRoll.evaluate();
		const hitResult = AttackHandler.determineHitMargin(
			attackRoll,
			defender.system.attributes[defenceKey].total,
			AttackHandler.canCrit(attacker)
		);

		let locationResult = null;
		if (AttackHandler.requiresLocationDisplay(hitResult)) {
			locationResult = await AttackHandler.rollHitLocation(defender);
		}

		const attackAttrLabel = game.i18n.localize(
			Utils.getLocalisedAttributeLabel(attackKey)
		);
		AttackHandler.createHitRollMessage(
			attackRoll,
			attacker,
			defender,
			attackAttrLabel,
			hitResult,
			locationResult
		);
	}

	static determineHitMargin(attackRoll, defenceVal, canCrit) {
		const hitMargin = attackRoll.total - defenceVal;
		const combinedResult={original: "", upgraded: null};

		if (hitMargin >= 5 && canCrit) {
			combinedResult.original= HIT_TYPE.crit;
		} else if (hitMargin >= 0) {
			combinedResult.original= HIT_TYPE.hit;
		} else {
			combinedResult.original= HIT_TYPE.miss;
		}
		if(AttackHandler.upgradeRoll(attackRoll)) {
			let upgradeResult=""
			if(canCrit) upgradeResult=HIT_TYPE.crit;
			else upgradeResult=HIT_TYPE.hit;
			if(upgradeResult!=combinedResult.original) {
				combinedResult.upgraded=upgradeResult;
			}
		}
		return combinedResult;
	}

	static async createHitRollMessage(
		attackRoll,
		attacker,
		defender,
		attackAttrLabel,
		hitResult,
		locationResult
	) {
		const displayString = [];
		//Intro
		const introductionMessage = game.i18n
			.localize("ROLLTEXT.attackHeader")
			.replace("_ATTACKER_NAME_", attacker.name)
			.replace("_TARGET_NAME_", defender.name);
		const introductionHtml=`<div class="message-header">${introductionMessage}</div>`
		displayString.push(introductionHtml);

		//To hit
		let hitResultText="";
		if(hitResult.upgraded) {
			hitResultText="<s>"+game.i18n.localize("HIT."+hitResult.original)+"</s> "+game.i18n.localize("HIT."+hitResult.upgraded);
		} else {
			hitResultText=game.i18n.localize("HIT."+hitResult.original);
		}
		const hitRollDisplay = await renderTemplate(
			"systems/hooklineandmecha/templates/partials/labelled-roll-partial.html",
			{
				label_left: game.i18n
				.localize("ROLLTEXT.attackIntro")
				.replace("_ATTRIBUTE_NAME_", attackAttrLabel),
				total: attackRoll.total,
				tooltip: `${attackRoll.formula}:  ${attackRoll.result}`,
				outcome: hitResultText,
			}
		);
		displayString.push(hitRollDisplay);

		if (AttackHandler.requiresLocationDisplay(hitResult)) {
			const locationDisplay = await AttackHandler.generateLocationDisplay(
				locationResult
			);
			displayString.push(locationDisplay);
		}

		const hitMessage = await ChatMessage.create({
			speaker: {actor: attacker},
			content: displayString.join(""),
		});
	}

	static canCrit(actor) {
		return actor.type === ACTOR_TYPES.fisher;
	}

	static async rollHitLocation(defender) {
		const hitZoneInfo=defender.items.get(defender.system.size);
		const formula = hitZoneInfo.system.hitLocationRoll
			? hitZoneInfo.system.hitLocationRoll
			: "1";
		const locationRoll = new Roll(formula);
		await locationRoll.evaluate();

		const hitZone = hitZoneInfo.system.hitRegions.find((location) => {
			return AttackHandler.checkHitZone(locationRoll, location);
		});

		const columnRoll = new Roll("1d" + hitZone.columns.toString());
		await columnRoll.evaluate();

		return {locationRoll, hitZone, columnRoll};
	}

	static checkHitZone(locationRoll, hitZone) {
		return (
			locationRoll.total >= hitZone.range.at(0) &&
			locationRoll.total <= hitZone.range.at(-1)
		);
	}

	static async generateLocationDisplay(locationResult) {
		const locationDisplayParts = [];
		if (locationResult.locationRoll.formula !== "1") {
			let hitZone = await renderTemplate(
				"systems/hooklineandmecha/templates/partials/labelled-roll-partial.html",
				{
					label_left: game.i18n.localize("ROLLTEXT.hitZone"),
					tooltip: `${locationResult.locationRoll.formula}:  ${locationResult.locationRoll.result}`,
					total: locationResult.locationRoll.total,
					outcome: Utils.getLocalisedHitZone(
						locationResult.hitZone.location)
				}
			);
			locationDisplayParts.push(hitZone);
		}
		const column = await renderTemplate(
			"systems/hooklineandmecha/templates/partials/labelled-roll-partial.html",
			{
				label_left: game.i18n.localize("ROLLTEXT.hitColumn"),
				tooltip: locationResult.columnRoll.formula,
				total: locationResult.columnRoll.total,
			}
		);
		locationDisplayParts.push(column);
		return locationDisplayParts.join("");
	}

	static upgradeRoll(rollResult) {
		//Extract d6 terms from list of terms
		const diceResults=[];
		rollResult.terms.forEach((term) => {
			if(term.faces && term.faces===6) {
				diceResults.push(term);
			}
		})

		//Count 6s
		let counter=0;
		diceResults.forEach((term) => {
			term.results.forEach((die) => {
				if(die.result===6) counter+=1;
			})
		})

		return counter>1;
	}

	static requiresLocationDisplay(hitResult) {
		if(hitResult.upgraded) {
			return hitResult.upgraded===HIT_TYPE.hit;
		} 
		else {
			return hitResult.original===HIT_TYPE.hit;
		}
	}
}
