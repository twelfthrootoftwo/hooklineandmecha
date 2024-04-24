import { ITEM_TYPES } from "../constants.js";
import { Utils } from "../utilities/utils.js";

class InternalTag {
	name
	value

	constructor(name, value) {
		this.name=name;
		this.value=value;
	}
}

class Attack {
	type
	damage
	range

	constructor(type, damage, range) {
		this.type=type;
		this.damage=damage;
		this.range=range;
	}
}

/**
 * Extend the base Item to support custom behaviour.
 * @extends {Item}
 */
export class HLMItem extends Item {

}

/**
	 * Construct item data for the various item types
	 * @param {Object} record The base item record (name, type)
	 * @param {Object} data The JSON item data
	 * @param {FileRecord} source The file source of this item
	 */
export function createHLMItemData(record, data, source) {
	let system={};
	switch(record.type) {
		case ITEM_TYPES.tag:
			console.log("Tags not implemented yet");
			break;
		case ITEM_TYPES.size:
			console.log("Constructing size...");
			system=constructSizeData(data);
			break;
		case ITEM_TYPES.frame_pc:
			console.log("Constructing PC frame...");
			system=constructFrameData(data);
			break;
		case ITEM_TYPES.internal_pc:
			console.log("Constructing PC internal...");
			system=constructInternalPCData(data);
			break;
		case ITEM_TYPES.internal_npc:
			console.log("NPC internals not implemented yet");
			break;
	}
	system.source=source
	const itemData={
		"name": record.name,
		"type": record.type,
		"system": system
	};
	return itemData;
}

/**
 * Builds the system object for a size item
 * @param {Object} data The original json read
 * @returns the formatted system object
 */
function constructSizeData(data) {
	const system={
		attributes: {}
	};
	Object.keys(data).forEach((key) => {
		if (Utils.isAttribute(key)){
			system.attributes[key]=data[key];
		}
	});
	system.hitLocationRoll=data.hitLocationRoll;
	system.hitRegions=data.hitRegions;
	return system
}

function constructFrameData(data) {
	const system={
		attributes: {}
	};
	Object.keys(data).forEach((key) => {
		if (Utils.isAttribute(key)){
			system.attributes[key]=data[key];
		}
	});
	system.attributes.baseAP=data.ap; //AP attribute is named differently - #TODO convert?
	system.core_integrity=data.core_integrity;
	system.repair_kits=data.repair_kits;
	system.weight_cap=data.weight_cap;
	system.gear_ability=data.gear_ability;
	system.gear_ability_name=data.gear_ability_name;
	return system
}

function constructInternalPCData(data) {
	const system={
		attributes: {}
	};
	Object.keys(data).forEach((key) => {
		if (Utils.isAttribute(key)){
			system.attributes[key]=data[key];
		}
	});
	
	system.action_text=data.action_text;
	system.ap_cost=getAPCost(data);
	system.attack=constructAttack(data);
	system.ballast=data.ballast;
	system.repair_kits=data.repair_kits;
	system.tags=separateTags(data.tags);
	system.type=data.type;
	system.section=data.section;
	
	return system
}

function getAPCost(data) {
	if(data.type==="passive" || data.action_text.length == 0) return null;
	const apRegex=new RegExp("\(\\d+ap\)","i"); //looks for something of the form "(Xap)", ignoring case
	const apText=data.action_text.match(apRegex)[0];
	return Utils.extractIntFromString(apText);
}

function constructAttack(data) {
	const attackTypes=["melee","ranged","mental"];
	if(!attackTypes.includes(data.type)) return null;

	const rangeRegex=new RegExp("range \\d+","i"); //looks for something of the form "range X(X...)", ignoring case
	const damageRegex=new RegExp("damage \\[\\d+\\]","i") //looks for something of the form "damage [X(X...)]", ignoring case

	const rangeText=data.action_text.match(rangeRegex)[0];
	const rangeValue=Utils.extractIntFromString(rangeText);
	const damageText=data.action_text.match(damageRegex)[0];
	const damageValue=Utils.extractIntFromString(damageText);

	return new Attack(data.type, damageValue, rangeValue);
}

function separateTags(tagString) {
	const tags=[]
	if(tagString.length>0) {
		const tagList=tagString.split(", ")
		tagList.forEach((tagText) => {
			const tagWords=tagText.split(" ");
			let name="";
			let value=null;
			if(Utils.isNumeric(tagWords[tagWords.length-1])) {
				name=Utils.capitaliseWords(tagWords.slice(0,-1).join(" "));
				value=parseInt(tagWords[-1]);
			} else {
				name=Utils.capitaliseWords(tagText);
			}
			tags.push(new InternalTag(name=name, value=value));
		});
	}
	return tags;
}