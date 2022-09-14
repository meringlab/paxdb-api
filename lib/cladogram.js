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
            for (let i = 0; i < this.children.length; i += 1) {
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

        for (let i = 0; i < this.children.length; i += 1) {
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
        }
        if (aasc.id === basc.id) {
            return this;
        }
        const msg = `can't find common ancestor for [${a}, ${b}]`;
        log.error(msg);
        throw Error(msg);
    }
}

function loadCogs(cogid) {
    const data = fs.readFileSync(`./data/orthgroups/${cogid}-orthologs.txt`, { encoding: 'utf8' });
    const cogs = data.trim()
        .split('\n')
        .map((line) => {
            let members = line.split('\t');
            const name = members.shift();
            members = members.map(m => parseInt(m, 10));
            return { name, members };
        });
    return cogs;
}

log.info('constructing phylogenetic tree');

const primates = new Clade(9443, 'primates/homininae', loadCogs(9443), [
    new Taxon(9606, 'Homo Sapiens'), new Taxon(9598, 'chimpanzee'), new Taxon(9544, 'Macaca mulatta')
]);
const rodents = new Clade(9989, 'Rodents', loadCogs(9989), [
    new Taxon(10116, 'Rattus norvegicus'),
    new Taxon(10090, 'Mus musculus')
]);

const supraprimates = new Clade(314146, 'Euarchontoglires (Supraprimates)', loadCogs(314146), [
    rodents, primates,
    new Taxon(9986, 'rabbit')
    ]);

const mammals = new Clade(40674, 'Mammals', loadCogs(40674), [
    supraprimates,
    new Taxon(9615, 'Canis lupus familiaris'),
    new Taxon(9796, 'Equus caballus'),
    new Taxon(9685, 'cat'),
    new Clade(91561, 'cetartiodactyla', loadCogs(91561), [
        new Taxon(9823, 'Sus scrofa'),
        new Taxon(9913, 'Bos taurus'),
        new Taxon(89462, 'buffalo'),
        new Taxon(9940, 'sheep')
    ])
]);

const chordates = new Clade(7711, 'chordates', loadCogs(7711), [
    mammals,
    new Taxon(8364, 'Xenopus tropicalis'),
    new Taxon(8022, 'rainbow trout'),
    new Taxon(8030, 'Salmo salar'),
    new Taxon(9031, 'Gallus gallus'),
    new Taxon(7955, 'Danio rerio'),
    new Taxon(8355, 'Xenopus laevis')
]);

const anthropods = new Clade(6656, 'arthropods', loadCogs(6656), [
    new Taxon(7460, 'A. mellifera'),
    new Taxon(67767, 'Lasius niger'),
    new Taxon(121845, 'Diaphorina citri'),
    new Taxon(6945, 'Ixodes scapularis'),
    new Taxon(7091, 'Bombyx mori'),
    new Clade(7147, 'diptera', loadCogs(7147), [
        new Taxon(7165, 'mosquito'),
        new Taxon(7227, 'Drosophila melanogaster'),
        new Taxon(7159, 'Aedes aegypti'),
    ])
]);

const animals = new Clade(33208, /*METAZOA*/'Animals', loadCogs(33208), [
    new Taxon(6239, 'Caenorhabditis elegans'), 
    chordates,
    anthropods
]);

const fungi = new Clade(4751, 'Fungi', loadCogs(4751), [
    new Taxon(5061, 'A. niger'),
    new Taxon(214684, 'Cryptococcus neoformans'),
    new Taxon(4896, 'Schizosaccharomyces pombe'),        
    new Clade(4891, 'saccharomycetes', loadCogs(4891), [
        new Taxon(4932, 'Saccharomyces cerevisiae'),
        new Taxon(5476, 'C.albicans'),
        new Taxon(284590, 'Kluyveromyces lactis'),
    ])
]);

const Opisthokonta = new Clade(33154, 'Opisthokonta (Fungi/Animals)', loadCogs(33154), [
    fungi,
    animals
]);

const greenplants = new Clade(33090, 'greenplants', loadCogs(33090), [
    new Taxon(3055, 'Chlamydomonas reinhardtii'),
    new Clade(35493, 'streptophyta', loadCogs(35493), [
        new Taxon(2711, 'Citrus sinensis'),
        new Taxon(29760, 'Vitis vinifera'),
        new Taxon(3218, 'Physcomitrella patens'),
        new Taxon(3635, 'Gossypium hirsutum'),
        new Taxon(3702, 'Arabidopsis thaliana'),
        new Taxon(3708, 'Brassica napus'),
        new Taxon(109376, 'Brassica oleracea var. oleracea'),
        new Taxon(3827, 'Cicer arietinum'),
        new Taxon(3847, 'Glycine max'),
        new Taxon(3880, 'Medicago truncatula'),
        new Taxon(4081, 'Solanum lycopersicum'),
        new Taxon(4097, 'Nicotiana tabacum'),
        new Taxon(4113, 'Solanum tuberosum'),
        new Clade(4447, 'liliopsida', loadCogs(4447), [
            new Taxon(4577, 'Z.mays'),
            new Taxon(39947, 'Oryza sativa'),
            new Taxon(4513, 'Hordeum vulgare'),
            new Taxon(4565, 'Triticum aestivum'),
            new Taxon(65489, 'Oryza barthii')
        ]),

    ])
]);

const kinetoplasts = new Clade(5653, 'kinetoplasts', loadCogs(5653), [
    new Taxon(353153, 'Trypanosoma cruzi'),
    new Taxon(5691, 'Trypanosoma brucei')
]);

const apicomplexa= new Clade(5794, 'apicomplexa', loadCogs(5794), [
    new Taxon(5811, 'Toxoplasma gondii'),
    new Taxon(5833, 'P.falciparum'),
    new Taxon(73239, 'P.yoelii')
]);

const eucaryotes = new Clade(2759, 'Eucaryotes', loadCogs(2759), [
    Opisthokonta,
    greenplants,
    kinetoplasts,
    apicomplexa,
    new Taxon(44689, 'D.discoideum')
]);

const archaea = new Clade(2157, 'Archaea', loadCogs(2157), [
    new Taxon(64091, 'Halobacterium salinarum'),
    new Taxon(593117, 'Thermococcus gammatolerans EJ3'),
    new Taxon(309800, 'Haloferax volcanii DS2'),
    new Taxon(547559, 'Natrialba magadii ATCC 43099'),
]);


const bacillaceae = new Clade(1386, 'Bacillus', loadCogs(1386), [
    new Taxon(224308, 'Bacillus subtilis str. 168'),
    new Taxon(260799, 'Bacillus anthracis')
]);


const streptococuspneumoniae = new Clade(1313, 'streptococuspneumoniae', loadCogs(1313), [
    new Taxon(170187, 'Streptococcus pneumoniae TIGR4'),
    new Taxon(373153, 'Streptococcus pneumoniae D39')
])

const firmicutes = new Clade(1239, 'firmicutes', loadCogs(1239), [
    bacillaceae,
    streptococuspneumoniae,
    new Taxon(1314, 'Streptococcus pyogenes'),
    new Taxon(169963, 'L. monocytogenes EGD-e'),
    new Taxon(272623, 'Lactococcus lactis'),
    new Taxon(1280, 'S.aureus Mu50')
]);

const deproteobacteria = new Clade(68525, 'deproteobacteria', loadCogs(68525), [
    new Taxon(882, 'D.vulgaris'),
    new Clade(29547, 'epsilonproteobacteria', loadCogs(29547), [
        new Taxon(192222, ''),
        new Taxon(85962, '')
    ])
]);

const gammaproteobacteria = new Clade(1236, 'Gammaproteobacteria', loadCogs(1236), [
    new Taxon(99287, 'Salmonela typhimurium'),
    new Taxon(198214, 'Shigella flexneri'),
    new Taxon(214092, 'Y.pestis'),
    new Taxon(511145, 'Escherichia coli'),
    new Taxon(208964, 'P.aeruginosa'),
    new Taxon(211586, 'S.oneidensis MR-1'),
    new Taxon(272624, 'L.pneumophila'),
    new Taxon(243159, 'A.ferrooxidans'),
    new Taxon(1286170, 'Raoultella ornithinolytica B6'),
    new Taxon(160488, 'Pseudomonas putida KT2440'),
    new Taxon(272620, 'Klebsiella pneumoniae subsp. pneumoniae MGH 78578',),
]);

const proteobacteria = new Clade(1224, 'proteobacteria', loadCogs(1224), [
    gammaproteobacteria,
    deproteobacteria,
    new Taxon(122586, 'N.meningitidis MC58'),
    new Taxon(257313, 'Bordetella pertussis Tohama I'),
    new Taxon(212042, 'Anaplasma phagocytophilum str. HZ'),
    new Taxon(246200, 'Ruegeria pomeroyi DSS-3'),
    new Taxon(283166, 'B.henselae'),
    new Taxon(392499, 'Sphingomonas wittichii RW1'),
]);

const cyanobacteria = new Clade(1117, 'Cyanobacteria', loadCogs(1117), [
    new Taxon(1148, 'Synechocystis sp. PCC 6803'),
    new Taxon(449447, 'Microcystis aeruginosa'),
    new Taxon(1140, 'Synechococcus elongatus PCC 7942'),
]);

const bacteria = new Clade(2, 'Bacteria', loadCogs(2), [
    firmicutes,
    proteobacteria,
    cyanobacteria,
    new Taxon(265311, 'Mesoplasma florum L1'),
    new Taxon(347256, 'Mycoplasma hominis ATCC 23114'),
    new Taxon(722438, 'Mycoplasma pneumoniae'),
    new Taxon(267671, 'Leptospira interrogans'),
    new Taxon(546414, 'Deinococcus deserti VCD115'),
    new Taxon(100226, 'Streptomyces coelicolor A3(2)'),
    new Taxon(246196, 'Mycobacterium smegmatis str. MC2 155'),
    new Taxon(83332, 'Mycobacterium tuberculosis'),
    new Taxon(189518, 'L.interrogans'),
    new Taxon(224326, 'B.burgdorferi')
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
