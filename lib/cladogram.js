/* eslint-disable max-len,eqeqeq */
const fs = require('fs');
const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'paxdb-API',
  module: 'cladogram'
});


class Taxon {
  constructor(id, name, children) {
    this.id = id;
    this.name = name;
    this.children = children;
  }

  isAscendentOf(descendentId) {
    if (this.id == descendentId) {
      return true;
    }
    if (this.children) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        if (child.isAscendentOf(descendentId)) {
          return true;
        }
      }
    }
    return false;
  }
}

class Clade extends Taxon {
  constructor(id, name, nogs, children) {
    super(id, name, children);
    this.nogs = nogs;
  }

  /**
   *
   * @param Long
   * @return Clade
   */
  firstCommonAncestor(a, b) {
    if (this.id == a || this.id == b) {
      return this;
    }

    //@Taxon
    let aasc = null;
    let basc = null;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child.isAscendentOf(a)) {
        aasc = child;
      }
      if (child.isAscendentOf(b)) {
        basc = child;
      }
      if (aasc != null && basc != null) {
        break;
      }
    }

    if ((!aasc || !basc) || (aasc.id != basc.id)) {
      return this;
    }
    if (aasc instanceof Clade) {
      return aasc.firstCommonAncestor(a, b);
    } else if (aasc.id === basc.id) {
      return this;
    }
    const msg = `can't find common ancestor for [${a}, ${b}]`;
    log.error(msg);
    throw Error(msg);
  }
}

function loadCogs(cogid) {
  const data = fs.readFileSync(`./data/orthgroups/${cogid}-orthologs.txt`, { encoding: 'utf8' });
  const cogs = data.trim().split('\n').map(line => {
    let members = line.split('\t');
    const name = members.shift();
    members = members.map(m => parseInt(m, 10));
    return { name, members };
  });
  return cogs;
}

log.info('constructing phylogenetic tree');

const primates = new Clade(9443, 'primates/homininae', loadCogs(9443), [
  new Taxon(9606, 'Homo Sapiens'), new Taxon(9598, 'chimpanzee')
]);
const rodents = new Clade(9989, 'Rodents', loadCogs(9989), [
  new Taxon(10116, 'Rattus norvegicus'),
  new Taxon(10090, 'Mus musculus')
]);

const supraprimates = new Clade(314146, 'Euarchontoglires (Supraprimates)', loadCogs(314146), [rodents, primates]);

const laurasiatheria = new Clade(314145, 'Laurasiatheria (Mammalian subgroup)', loadCogs(314145),
  [
    new Taxon(9615, 'Canis lupus familiaris'),
    new Taxon(9796, 'Equus caballus'),
    new Clade(91561, 'cetartiodactyla', loadCogs(91561), [
      new Taxon(9823, 'Sus scrofa'),
      new Taxon(9913, 'Bos taurus')
    ])
  ]);
const mammals = new Clade(40674, 'Mammals', loadCogs(40674), [
  laurasiatheria,
  supraprimates
]);

const amniotes = new Clade(32524, 'amniotes', loadCogs(32524), [
  mammals,
  new Taxon(9031, 'Gallus gallus')
]);
const sarcopterygii = new Clade(8287, 'sarcopterygii', loadCogs(8287), [
  amniotes,
  new Taxon(8364, 'Xenopus tropicalis')
]);

const chordates = new Clade(7711, 'chordates', loadCogs(7711), [
  sarcopterygii,
  new Taxon(7955, 'Danio rerio')
]);
const anthropods = new Clade(6656, 'arthropods', loadCogs(6656), [
  new Taxon(7460, 'A. mellifera'),
  new Clade(7147, 'diptera', loadCogs(7147), [
    new Taxon(7165, 'mosquito'),
    new Taxon(7227, 'Drosophila melanogaster')
  ])
]);

const coelomata = new Clade(33316, 'coelomata', loadCogs(33316), [
  chordates,
  anthropods
]);

const animals = new Clade(33208, /*METAZOA*/'Animals', loadCogs(33208), [
  new Taxon(6239, 'Caenorhabditis elegans'), coelomata
]);

const fungi = new Clade(4751, 'Fungi', loadCogs(4751), [
  new Taxon(214684, 'Cryptococcus neoformans'),
  new Clade(4890, 'ascomycetes', loadCogs(4890), [
    new Taxon(4896, 'Schizosaccharomyces pombe'),
    new Clade(716545, 'saccharomyceta', loadCogs(716545), [
      new Taxon(4932, 'Saccharomyces cerevisiae'),
      new Taxon(5061, 'A. niger')
    ])
  ])
]);

const Opisthokonta = new Clade(33154, 'Opisthokonta (Fungi/Animals)', loadCogs(33154), [
  fungi,
  animals
]);

const greenplants = new Clade(33090, 'greenplants', loadCogs(33090), [
  new Taxon(3055, 'Chlamydomonas reinhardtii'),
  new Clade(35493, 'streptophyta', loadCogs(35493), [
    new Taxon(3702, 'Arabidopsis thaliana'),
    new Taxon(4081, 'Solanum lycopersicum'),
    new Clade(4447, 'liliopsida', loadCogs(4447), [
      new Taxon(4577, ''),
      new Taxon(39947, 'Oryza sativa')
    ])
  ])
]);

const kinetoplasts = new Clade(5653, 'kinetoplasts', loadCogs(5653), [
  new Taxon(353153, 'Trypanosoma cruzi'),
  new Taxon(5691, 'Trypanosoma brucei')
]);

const eucaryotes = new Clade(2759, 'Eucaryotes', loadCogs(2759), [
  Opisthokonta,
  greenplants,
  kinetoplasts,
  new Taxon(5833, '')
]);

const archaea = new Clade(2157, 'Archaea', loadCogs(2157), [
  new Taxon(64091, 'Halobacterium salinarum'),
  new Taxon(593117, 'Thermococcus gammatolerans EJ3')
]);


const bacillaceae = new Clade(186817, 'Bacilli', loadCogs(186817), [
  new Taxon(224308, 'Bacillus subtilis str. 168'),
  new Taxon(260799, 'Bacillus anthracis')
]);

const bacillales = new Clade(1385, 'bacillales', loadCogs(1385), [
  new Taxon(158878, ''),
  new Taxon(169963, ''),
  bacillaceae
]);

const lactobacillales = new Clade(186826, 'lactobacillales', loadCogs(186826), [
  new Taxon(272623, 'Lactococcus lactis'),
  new Taxon(160490, 'Streptococcus pyogenes')
]);

const firmicutes = new Clade(1239, 'firmicutes', loadCogs(1239), [
  lactobacillales,
  bacillales
]);

const deproteobacteria = new Clade(68525, 'deproteobacteria', loadCogs(68525), [
  new Taxon(882, ''),
  new Clade(29547, 'epsilonproteobacteria', loadCogs(29547), [
    new Taxon(192222, ''),
    new Taxon(85962, '')
  ])
]);

const enterobacteriaceae = new Clade(543, 'enterobacteriaceae', loadCogs(543), [
  new Taxon(99287, 'Salmonela typhimurium'),
  new Taxon(198214, 'Shigella flexneri'),
  new Taxon(214092, ''),
  new Taxon(511145, 'Escherichia coli')
]);

const gammaproteobacteria = new Clade(1236, 'Gammaproteobacteria', loadCogs(1236), [
  enterobacteriaceae,
  new Taxon(208964, ''),
  new Taxon(211586, '')
]);

const proteobacteria = new Clade(1224, 'proteobacteria', loadCogs(1224), [
  gammaproteobacteria,
  deproteobacteria,
  new Taxon(122586, '')
]);

const cyanobacteria = new Clade(1117, 'Cyanobacteria', loadCogs(1117), [
  new Taxon(1148, 'Synechocystis sp. PCC 6803'),
  new Taxon(449447, 'Microcystis aeruginosa')
]);

const bacteria = new Clade(2, 'Bacteria', loadCogs(2), [
  firmicutes,
  proteobacteria,
  cyanobacteria,
  new Taxon(722438, 'Mycoplasma pneumoniae'),
  new Taxon(226186, ''),
  new Taxon(267671, 'Leptospira interrogans'),
  new Taxon(546414, 'Deinococcus deserti VCD115'),
  new Taxon(83332, 'Mycobacterium tuberculosis')
]);

const phylogeneticTree = new Clade(1, 'cellular organisms', loadCogs(1), [bacteria, archaea, eucaryotes]);

module.exports = phylogeneticTree;

//test
// var species = require('./species')
// for (var s in species) {
//   for (var d in species) {
//     if (s == d) {
//       continue;
//     }
//     try {
//       var a = phylogeneticTree.firstCommonAncestor(s, d);
//       console.log(`${s}/${d}: ${a.name}`);
//     } catch (e) {
//       console.log(`failed for ${s}/${d}: ${e}`);
//     }
//   }
// }
