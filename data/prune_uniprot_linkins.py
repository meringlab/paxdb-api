species_ids =set([str(i) for i in [882,1148,3055,3702,4081,4577,4896,4932,5061,5691,5833,6239,7165,7227,7460,7955,8364,9031,9598,9606,9615,9796,9823,9913,10090,10116,39947,44689,64091,83332,85962,99287,122586,158878,160490,169963,192222,198214,208964,211586,214092,214684,224308,226186,243159,260799,267671,272623,272624,283166,353153,449447,511145,546414,593117,722438]])

with open('string_uniprot_linkins_ids.tsv','r') as inp:
  with open('paxdb_uniprot_linkins_ids.tsv','w') as out:
    current = 'None'
    for line in inp:
      if not line.startswith(current):
        current = line.split('.')[0]
      if current in species_ids:
        out.write(line)
