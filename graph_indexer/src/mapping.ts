import {
  Transfer as TransferEvent,
  Cryptostamp2 as Cryptostamp2Contract
} from "../generated/Cryptostamp2/Cryptostamp2"
import { Ownership, Stamp, User } from "../generated/schema"

export function handleTransfer(event: TransferEvent): void {
  // Get the user (or make a new one if needed)
  let user = User.load(event.params.to.toHexString())
  if (user == null) {
    user = new User(event.params.to.toHexString())
    user.save()
  }

  // See if stamp has already been minted
  let stamp = Stamp.load(event.params.tokenId.toString())
  if (stamp != null) {
    // End previous ownership
    let prevOwnership = Ownership.load(stamp.currentOwnership)
    prevOwnership.end = event.block.timestamp
    prevOwnership.save()
  } else {
    // Create new stamp
    stamp = new Stamp(event.params.tokenId.toString())
    let contract = Cryptostamp2Contract.bind(event.address)
    stamp.metadataURI = contract.tokenURI(event.params.tokenId)
  }

  // Create new ownership
  let ownership = new Ownership(event.transaction.hash.toHexString())
  ownership.user = user.id
  ownership.stamp = stamp.id
  ownership.start = event.block.timestamp
  ownership.save()

  stamp.currentOwnership = event.transaction.hash.toHexString();
  stamp.save()
}
